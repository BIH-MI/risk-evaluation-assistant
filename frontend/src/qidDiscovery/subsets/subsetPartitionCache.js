import { buildSubsetStatistics } from "../metrics/profile";

// Convert an attribute subset into one standard ordering so that the same
// subset is always represented by the same cache key.
export const canonicalizeStableAttributeIds = (stableAttributeIds = []) =>
  [...stableAttributeIds].sort();

/**
 * Builds a stable cache key from source-column identities rather than current
 * candidate-array positions or display names. JSON encoding avoids collisions
 * when source field names contain a separator character.
 */
export function createSubsetKey(stableAttributeIds = []) {
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
 * Adds one attribute to an existing subset by splitting each existing
 * equivalence class according to the encoded value of the new attribute. This
 * reuses the parent partition and avoids reconstruction from raw rows.
 */
export function refinePartition(parentPartition, columnCodes) {
  const refinedGroups = new Map();
  const rowGroupIds = new Uint32Array(columnCodes.length);
  const classSizes = [];
  let nextGroupId = 0;

  for (let rowIndex = 0; rowIndex < columnCodes.length; rowIndex += 1) {
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

/**
 * Caches evaluated attribute subsets and their partitions for one table
 * profiling source. The cache survives rename, exclude/include, datatype
 * display edits, and candidate reordering because keys use stable source
 * identities. It is discarded with the profiling source when the table is
 * removed or replaced.
 *
 * Cached partitions, rowGroupIds, and encoded values are transient
 * browser-local state and must never be persisted to the backend.
 */
export class SubsetPartitionCache {
  constructor(profilingSource) {
    this.columnsBySourceField = profilingSource.columnsBySourceField;
    this.analysedRecordCount = profilingSource.recordCount;
    this.cache = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Exposes a cached entry for diagnostics. Do not serialize the returned
   * object into application state or backend payloads.
   */
  peek(stableAttributeIds) {
    return this.cache.get(createSubsetKey(stableAttributeIds));
  }

  /**
   * Returns aggregate cache counters without exposing participant-level
   * partitions.
   */
  getStats() {
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }

  /**
   * Returns the cache entry for a stable subset, computing partition and
   * metrics once when the key is first requested.
   */
  getEntry(stableAttributeIds) {
    const canonicalStableAttributeIds =
      canonicalizeStableAttributeIds(stableAttributeIds);
    const key = createSubsetKey(canonicalStableAttributeIds);

    if (this.cache.has(key)) {
      this.hitCount += 1;
      return this.cache.get(key);
    }

    this.missCount += 1;
    const partition = this.buildPartition(canonicalStableAttributeIds);
    const metrics = buildSubsetStatistics(
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
   * Builds a partition by recursively reusing the cached parent subset and
   * refining it with the next encoded source column.
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
}
