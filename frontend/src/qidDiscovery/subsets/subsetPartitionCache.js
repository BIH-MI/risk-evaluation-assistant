import { buildSubsetStatistics } from "../metrics/profile";

// Sorting gives every attribute subset one canonical ordering, so the same
// subset always maps to the same cache key and the same parent prefix.
const canonicalizeSourceFields = (sourceFields = []) =>
  [...sourceFields].sort();

/**
 * Builds a cache key from source fields rather than display names or
 * candidate-array positions. JSON encoding avoids collisions when source field
 * names contain a separator character.
 */
function createSubsetKey(sourceFields = []) {
  return JSON.stringify(canonicalizeSourceFields(sourceFields));
}

/**
 * Creates the initial equivalence-class partition for one encoded attribute.
 * Records with the same encoded value receive the same group ID.
 */
function buildSingleColumnPartition(codes) {
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
function refinePartition(parentPartition, columnCodes) {
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
 * Caches attribute subset results for one table profiling session, keyed by
 * source fields so renames keep hitting the same entries.
 *
 * The two tiers have deliberately different lifetimes:
 * - Subset metrics are a handful of aggregate numbers. They are kept for the
 *   whole session, so refreshes after rename/exclude/include reuse every
 *   subset that was already evaluated.
 * - Partitions hold one rowGroupId per record (memory ~ subsets x rows). They
 *   are only needed as parents for the next subset size, so the subset
 *   profiler releases them layer by layer and drops all of them at the end of
 *   each profiling run. A later miss rebuilds the parent chain from the
 *   encoded columns, which yields identical partitions.
 *
 * Partitions, rowGroupIds, and encoded values are transient browser-local
 * state and must never be persisted to the backend.
 */
export class SubsetPartitionCache {
  constructor(profilingSource) {
    this.columnsBySourceField = profilingSource.columnsBySourceField;
    this.analysedRecordCount = profilingSource.recordCount;
    this.metricsByKey = new Map();
    this.partitionsBySubsetSize = new Map();
  }

  /**
   * Returns aggregate metrics for an attribute subset, building its partition
   * only when the subset has not been evaluated before in this session.
   */
  getMetrics(sourceFields) {
    const canonicalSourceFields = canonicalizeSourceFields(sourceFields);
    const key = createSubsetKey(canonicalSourceFields);
    const cachedMetrics = this.metricsByKey.get(key);
    if (cachedMetrics) return cachedMetrics;

    const partition = this.getPartition(canonicalSourceFields, key);
    const metrics = buildSubsetStatistics(
      partition.classSizes,
      this.analysedRecordCount
    );

    this.metricsByKey.set(key, metrics);
    return metrics;
  }

  /**
   * Returns the partition for canonical source fields by refining the cached
   * parent subset (all but the last source field) with the next encoded
   * column. Missing parents are rebuilt recursively.
   */
  getPartition(
    canonicalSourceFields,
    key = createSubsetKey(canonicalSourceFields)
  ) {
    const subsetSize = canonicalSourceFields.length;
    let partitionsByKey = this.partitionsBySubsetSize.get(subsetSize);
    const cachedPartition = partitionsByKey?.get(key);
    if (cachedPartition) return cachedPartition;

    const lastSourceField = canonicalSourceFields[subsetSize - 1];
    const lastColumnCodes =
      this.columnsBySourceField.get(lastSourceField).encoded.codes;
    const partition =
      subsetSize === 1
        ? buildSingleColumnPartition(lastColumnCodes)
        : refinePartition(
            this.getPartition(canonicalSourceFields.slice(0, -1)),
            lastColumnCodes
          );

    if (!partitionsByKey) {
      partitionsByKey = new Map();
      this.partitionsBySubsetSize.set(subsetSize, partitionsByKey);
    }
    partitionsByKey.set(key, partition);

    return partition;
  }

  /**
   * Releases partitions that can no longer be parents: subsets of size k+1
   * only refine partitions of size k.
   */
  releasePartitionsSmallerThan(subsetSize) {
    Array.from(this.partitionsBySubsetSize.keys()).forEach((size) => {
      if (size < subsetSize) this.partitionsBySubsetSize.delete(size);
    });
  }

  releaseAllPartitions() {
    this.partitionsBySubsetSize.clear();
  }
}
