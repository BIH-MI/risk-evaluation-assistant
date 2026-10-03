import { SubsetPartitionCache } from "./subsetPartitionCache";

export const DEFAULT_MAX_SUBSET_SIZE = 4;
export const DEFAULT_MAX_EVALUATED_SUBSETS = 25000;

const emptySummary = ({
  maxSubsetSize,
  maxEvaluatedSubsets,
  candidateAttributeCount,
  evaluatedSubsetCount = 0,
}) => ({
  maxSubsetSize,
  maxEvaluatedSubsets,
  candidateAttributeCount,
  evaluatedSubsetCount,
});

function calculateBinomial(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  const effectiveK = Math.min(k, n - k);
  let result = 1;

  for (let i = 1; i <= effectiveK; i += 1) {
    result = (result * (n - effectiveK + i)) / i;
  }

  return Math.round(result);
}

export function calculateEvaluatedSubsetTotal(attributeCount, maxSubsetSize) {
  const largestSubsetSize = Math.min(maxSubsetSize, attributeCount);
  let total = 0;

  for (let subsetSize = 2; subsetSize <= largestSubsetSize; subsetSize += 1) {
    total += calculateBinomial(attributeCount, subsetSize);
  }

  return total;
}

function createAggregateBucket() {
  return {
    evaluatedSubsetCount: 0,
    distinctionSum: 0,
    separationSum: 0,
    singletonFractionSum: 0,
  };
}

function addSubsetMetrics(aggregate, subsetSize, metrics) {
  let bucket = aggregate.bySubsetSize.get(subsetSize);

  if (!bucket) {
    bucket = createAggregateBucket();
    aggregate.bySubsetSize.set(subsetSize, bucket);
  }

  bucket.evaluatedSubsetCount += 1;
  bucket.distinctionSum += metrics.distinction || 0;
  bucket.separationSum += metrics.separation || 0;
  bucket.singletonFractionSum += metrics.singletonFraction || 0;
}

function mean(sum, count) {
  return count ? sum / count : null;
}

function materializeAggregate(aggregate) {
  const bySubsetSize = Array.from(aggregate.bySubsetSize.entries())
    .sort(([left], [right]) => left - right)
    .map(([subsetSize, bucket]) => ({
      subsetSize,
      evaluatedSubsetCount: bucket.evaluatedSubsetCount,
      meanDistinction: mean(
        bucket.distinctionSum,
        bucket.evaluatedSubsetCount
      ),
      meanSeparation: mean(bucket.separationSum, bucket.evaluatedSubsetCount),
      meanSingletonFraction: mean(
        bucket.singletonFractionSum,
        bucket.evaluatedSubsetCount
      ),
    }));

  const overall = bySubsetSize.length
    ? {
        evaluatedSubsetCount: bySubsetSize.reduce(
          (sum, item) => sum + item.evaluatedSubsetCount,
          0
        ),
        maxSubsetSize: bySubsetSize[bySubsetSize.length - 1].subsetSize,
        meanDistinction: mean(
          bySubsetSize.reduce(
            (sum, item) => sum + (item.meanDistinction || 0),
            0
          ),
          bySubsetSize.length
        ),
        meanSeparation: mean(
          bySubsetSize.reduce(
            (sum, item) => sum + (item.meanSeparation || 0),
            0
          ),
          bySubsetSize.length
        ),
        meanSingletonFraction: mean(
          bySubsetSize.reduce(
            (sum, item) => sum + (item.meanSingletonFraction || 0),
            0
          ),
          bySubsetSize.length
        ),
      }
    : null;

  return {
    bySubsetSize,
    overall,
  };
}

function enumerateSubsets(candidateColumns, subsetSize, onSubset) {
  const selected = [];

  function visit(startIndex) {
    if (selected.length === subsetSize) {
      onSubset(selected.map((index) => candidateColumns[index]));
      return;
    }

    const remainingSlots = subsetSize - selected.length;
    const lastStart = candidateColumns.length - remainingSlots;

    for (let index = startIndex; index <= lastStart; index += 1) {
      selected.push(index);
      visit(index + 1);
      selected.pop();
    }
  }

  visit(0);
}

function getSubsetPartitionCache(profilingSource) {
  if (!profilingSource.subsetPartitionCache) {
    profilingSource.subsetPartitionCache = new SubsetPartitionCache(
      profilingSource
    );
  }

  return profilingSource.subsetPartitionCache;
}

/**
 * Exhaustively evaluates every eligible attribute subset of size 2..m and
 * streams each result into per-attribute/per-size running aggregates. The full
 * list of subset results is intentionally never retained in application state:
 * only aggregated Distinguishability evidence leaves this function.
 */
export function profileAttributeSubsets(
  candidateColumns = [],
  profilingSource,
  configuration = {}
) {
  const maxSubsetSize = Number(configuration.maxSubsetSize);
  const maxEvaluatedSubsets = Number(configuration.maxEvaluatedSubsets);
  const safeMaxSubsetSize = Number.isInteger(maxSubsetSize)
    ? maxSubsetSize
    : DEFAULT_MAX_SUBSET_SIZE;
  const safeMaxEvaluatedSubsets = Number.isInteger(maxEvaluatedSubsets)
    ? maxEvaluatedSubsets
    : DEFAULT_MAX_EVALUATED_SUBSETS;
  const candidateAttributeCount = candidateColumns.length;
  const boundedMaxSubsetSize = Math.min(
    safeMaxSubsetSize,
    candidateAttributeCount
  );
  const evaluatedSubsetCount = calculateEvaluatedSubsetTotal(
    candidateAttributeCount,
    boundedMaxSubsetSize
  );

  if (
    evaluatedSubsetCount > safeMaxEvaluatedSubsets
  ) {
    throw new Error(
      `Subset profiling would evaluate ${evaluatedSubsetCount.toLocaleString()} subsets for ${candidateAttributeCount.toLocaleString()} eligible attributes, exceeding the configured limit of ${safeMaxEvaluatedSubsets.toLocaleString()}. Reduce the maximum subset size or increase the evaluated-subset safety limit.`
    );
  }

  const summary = emptySummary({
    maxSubsetSize: safeMaxSubsetSize,
    maxEvaluatedSubsets: safeMaxEvaluatedSubsets,
    candidateAttributeCount,
    evaluatedSubsetCount,
  });

  if (
    candidateAttributeCount < 2 ||
    boundedMaxSubsetSize < 2 ||
    !profilingSource
  ) {
    return {
      evidenceByStableAttributeId: new Map(),
      summary,
    };
  }

  const cache = getSubsetPartitionCache(profilingSource);
  const aggregates = new Map(
    candidateColumns.map((candidate) => [
      candidate.stableAttributeId,
      {
        bySubsetSize: new Map(),
      },
    ])
  );

  for (let subsetSize = 2; subsetSize <= boundedMaxSubsetSize; subsetSize += 1) {
    enumerateSubsets(candidateColumns, subsetSize, (subsetColumns) => {
      const stableAttributeIds = subsetColumns.map(
        (column) => column.stableAttributeId
      );
      const { metrics } = cache.getEntry(stableAttributeIds);

      stableAttributeIds.forEach((stableAttributeId) => {
        const aggregate = aggregates.get(stableAttributeId);
        if (aggregate) {
          addSubsetMetrics(aggregate, subsetSize, metrics);
        }
      });
    });
  }

  return {
    evidenceByStableAttributeId: new Map(
      Array.from(aggregates.entries()).map(([stableAttributeId, aggregate]) => [
        stableAttributeId,
        materializeAggregate(aggregate),
      ])
    ),
    summary,
  };
}
