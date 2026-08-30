/**
 * Summarizes the size distribution of equivalence classes for either one
 * profiled attribute or one searched attribute combination.
 */
export function summarizeClassSizes(classSizes = []) {
  if (!classSizes.length) {
    return {
      minimumEquivalenceClassSize: null,
      medianEquivalenceClassSize: null,
      maximumEquivalenceClassSize: null,
    };
  }

  const sorted = [...classSizes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  return {
    minimumEquivalenceClassSize: sorted[0],
    medianEquivalenceClassSize: median,
    maximumEquivalenceClassSize: sorted[sorted.length - 1],
  };
}

/**
 * Counts equivalence classes containing exactly one record. Under the current
 * definition each singleton class contains one singleton record.
 */
export function summarizeSingletons(classSizes = []) {
  const singletonClassCount = classSizes.filter((size) => size === 1).length;

  return {
    singletonClassCount,
    singletonRecordCount: singletonClassCount,
  };
}
