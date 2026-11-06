import { CSV_RESOURCE_LIMITS } from "./resourceLimits";
import { buildSubsetStatistics } from "./metrics/profile";

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
 *   are held in a bounded least-recently-used cache. The subset profiler also
 *   releases them layer by layer and drops all of them after each run. A later
 *   miss rebuilds the parent chain from encoded columns with identical results.
 *
 * Partitions, rowGroupIds, and encoded values are transient browser-local
 * state and must never be persisted to the backend.
 */
export class SubsetPartitionCache {
  constructor(profilingSource) {
    this.columnsBySourceField = profilingSource.columnsBySourceField;
    this.analysedRecordCount = profilingSource.recordCount;
    this.metricsByKey = new Map();
    this.partitionsByKey = new Map();
    this.partitionCacheBytes = 0;
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
    const cached = this.partitionsByKey.get(key);
    if (cached) {
      // Keep recently used parents while evicting older partitions first.
      this.partitionsByKey.delete(key);
      this.partitionsByKey.set(key, cached);
      return cached.partition;
    }

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

    // Budget retained numeric storage plus an allowance for entry/key overhead.
    // This is a cache budget, not a bound on the whole worker heap. A partition
    // too large to cache remains temporary; eviction never drops observations.
    const bytes =
      partition.rowGroupIds.byteLength +
      partition.classSizes.length * 16 +
      key.length * 2 + 256;
    if (bytes <= CSV_RESOURCE_LIMITS.maxPartitionCacheBytes) {
      while (
        this.partitionCacheBytes + bytes > CSV_RESOURCE_LIMITS.maxPartitionCacheBytes
      ) {
        this.releasePartition(this.partitionsByKey.keys().next().value);
      }
      this.partitionsByKey.set(key, { partition, subsetSize, bytes });
      this.partitionCacheBytes += bytes;
    }

    return partition;
  }

  /**
   * Releases partitions that can no longer be parents: subsets of size k+1
   * only refine partitions of size k.
   */
  releasePartitionsSmallerThan(subsetSize) {
    for (const [key, entry] of this.partitionsByKey) {
      if (entry.subsetSize < subsetSize) this.releasePartition(key);
    }
  }

  releasePartition(key) {
    const entry = this.partitionsByKey.get(key);
    if (!entry) return;
    this.partitionCacheBytes -= entry.bytes;
    this.partitionsByKey.delete(key);
  }

  releaseAllPartitions() {
    this.partitionsByKey.clear();
    this.partitionCacheBytes = 0;
  }
}
