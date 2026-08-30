import { buildCombinationStatistics } from "../metrics/profile";
import { calculateSearchScore, isTargetSatisfied } from "./ranking";

// Convert an attribute combination into one standard ordering so that the
// same combination is always represented by the same cache key.
export const canonicalizeStableAttributeIds = (stableAttributeIds = []) =>
  [...stableAttributeIds].sort();

/**
 * Builds a stable cache key from source-column identities rather than current
 * candidate-array positions or display names. JSON encoding avoids collisions
 * when source field names contain a separator character.
 */
export function createCombinationKey(stableAttributeIds = []) {
  return JSON.stringify(canonicalizeStableAttributeIds(stableAttributeIds));
}

/**
 * Creates the initial equivalence-class partition for one encoded attribute.
 * Records with the same encoded value receive the same group ID.
 */
export function buildSingleColumnPartition(codes) {
  const classSizes = [];

  for (const code of codes) {
    classSizes[code] = (classSizes[code] || 0) + 1;
  }

  return {
    rowGroupIds: codes,
    classSizes,
  };
}

/**
 * Adds one attribute to an existing combination by splitting each existing
 * equivalence class according to the encoded value of the new attribute. This
 * reuses the parent partition and avoids reconstruction from raw rows.
 */
export function refinePartition(parentPartition, columnCodes) {
  const refinedGroups = new Map();
  const rowGroupIds = new Uint32Array(columnCodes.length);
  const classSizes = [];
  let nextGroupId = 0;

  for (let rowIndex = 0; rowIndex < columnCodes.length; rowIndex += 1) {
    // The refinement key represents:
    //   existing equivalence-class ID + new attribute value code.
    // Two records remain in the same refined equivalence class only when both
    // components are equal.
    const refinementKey = `${parentPartition.rowGroupIds[rowIndex]}|${columnCodes[rowIndex]}`;

    if (!refinedGroups.has(refinementKey)) {
      refinedGroups.set(refinementKey, nextGroupId);
      nextGroupId += 1;
    }

    const groupId = refinedGroups.get(refinementKey);
    rowGroupIds[rowIndex] = groupId;
    classSizes[groupId] = (classSizes[groupId] || 0) + 1;
  }

  return {
    rowGroupIds,
    classSizes,
  };
}

export function buildCandidateMap(candidateColumns) {
  return new Map(
    candidateColumns.map((candidate) => [
      candidate.stableAttributeId,
      candidate,
    ])
  );
}

function getDisplayName(stableAttributeId, candidateMap) {
  return (
    candidateMap.get(stableAttributeId)?.attributeName || stableAttributeId
  );
}

/**
 * Caches evaluated attribute combinations and their partitions for one table
 * profiling source. The cache survives rename, exclude/include, datatype
 * display edits, and candidate reordering because keys use stable source
 * identities. It is discarded with the profiling source when the table is
 * removed or replaced.
 *
 * Cached partitions, rowGroupIds, encoded values, and scores are transient
 * browser-local state and must never be persisted to the backend.
 */
export class CombinationCache {
  constructor(profilingSource) {
    this.columnsBySourceField = profilingSource.columnsBySourceField;
    this.analysedRecordCount = profilingSource.recordCount;
    this.cache = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Resolves local search indices to stable source identities, reuses any
   * cached partition/metrics entry, and returns a result with current display
   * names and option-dependent ranking fields.
   */
  getByCandidateIndices(
    indices,
    candidateColumns,
    options,
    candidateMap = buildCandidateMap(candidateColumns)
  ) {
    const canonicalIndices = [...indices].sort((left, right) => left - right);
    const stableAttributeIds = canonicalIndices.map(
      (index) => candidateColumns[index].stableAttributeId
    );
    const entry = this.getEntry(stableAttributeIds);

    return this.materializeResult(
      entry,
      candidateMap,
      options,
      canonicalIndices,
      stableAttributeIds
    );
  }

  /**
   * Exposes a cached entry for tests and diagnostics. Do not serialize the
   * returned object into application state or backend payloads.
   */
  peek(stableAttributeIds) {
    return this.cache.get(createCombinationKey(stableAttributeIds));
  }

  /**
   * Returns aggregate cache counters that can be used by tests without
   * exposing participant-level partitions.
   */
  getStats() {
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }

  /**
   * Returns the cache entry for a stable combination, computing partition and
   * metrics once when the key is first requested.
   */
  getEntry(stableAttributeIds) {
    const canonicalStableAttributeIds =
      canonicalizeStableAttributeIds(stableAttributeIds);
    const key = createCombinationKey(canonicalStableAttributeIds);

    if (this.cache.has(key)) {
      this.hitCount += 1;
      return this.cache.get(key);
    }

    this.missCount += 1;
    const partition = this.buildPartition(canonicalStableAttributeIds);
    const metrics = buildCombinationStatistics(
      canonicalStableAttributeIds,
      partition.classSizes,
      this.analysedRecordCount
    );
    const entry = {
      key,
      stableAttributeIds: canonicalStableAttributeIds,
      partition,
      metrics,
    };

    this.cache.set(key, entry);
    return entry;
  }

  /**
   * Builds a partition by recursively reusing the cached parent combination
   * and refining it with the next encoded source column.
   */
  buildPartition(canonicalStableAttributeIds) {
    if (canonicalStableAttributeIds.length === 1) {
      const source = this.columnsBySourceField.get(
        canonicalStableAttributeIds[0]
      );
      return buildSingleColumnPartition(source.encoded.codes);
    }

    const parentStableAttributeIds = canonicalStableAttributeIds.slice(0, -1);
    const nextStableAttributeId =
      canonicalStableAttributeIds[canonicalStableAttributeIds.length - 1];
    const parent = this.getEntry(parentStableAttributeIds);
    const nextColumn = this.columnsBySourceField.get(nextStableAttributeId);

    return refinePartition(parent.partition, nextColumn.encoded.codes);
  }

  /**
   * Converts cache-stored stable metrics into a search result using current
   * display names and current search options.
   */
  materializeResult(
    entry,
    candidateMap,
    options,
    localIndices,
    displayStableAttributeIds
  ) {
    const result = {
      ...entry.metrics,
      key: entry.key,
      stableAttributeIds: entry.stableAttributeIds,
      attributeNames: displayStableAttributeIds.map((stableAttributeId) =>
        getDisplayName(stableAttributeId, candidateMap)
      ),
      indices: localIndices,
      partition: entry.partition,
    };

    result.score = calculateSearchScore(result, options);
    result.targetSatisfied = isTargetSatisfied(result, options);
    return result;
  }
}
