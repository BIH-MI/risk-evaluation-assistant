import { CSV_RESOURCE_LIMITS } from "./resourceLimits";
import { validateQidDiscoveryProfilingConfiguration } from "../validation/qidConfigurationValidation";
import { SubsetPartitionCache } from "./subsetPartitionCache";

/**
 * @typedef {Object} SubsetProfilingSummary
 * @property {number} maxSubsetSize Configured maximum subset size.
 * @property {number} effectiveMaxSubsetSize Largest subset size actually evaluated (0 when none).
 * @property {boolean} adjusted Whether safety limits reduced the requested coverage.
 * @property {number} maxEvaluatedSubsets Configured subset-count safety limit.
 * @property {number} candidateAttributeCount Eligible attributes considered.
 * @property {number} evaluatedSubsetCount Attribute subsets evaluated.
 */

/**
 * Attribute as prepared by buildCandidateColumns for subset profiling.
 *
 * @typedef {Object} SubsetCandidateColumn
 * @property {string} attributeName Current display name.
 * @property {string} sourceField Source field of the encoded column.
 * @property {Uint32Array} codes Browser-local encoded values.
 */

// Only admission-limit failures can be recovered as missing subset evidence.
export class SubsetProfilingLimitError extends Error {}

const MIN_SUBSET_SIZE = 2;

function createSubsetProfilingSummary({
  maxSubsetSize,
  maxEvaluatedSubsets,
  candidateAttributeCount = 0,
  evaluatedSubsetCount = 0,
  effectiveMaxSubsetSize = 0,
  adjusted = false,
}) {
  return {
    maxSubsetSize,
    maxEvaluatedSubsets,
    candidateAttributeCount,
    evaluatedSubsetCount,
    effectiveMaxSubsetSize,
    adjusted,
  };
}

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

function calculateEvaluatedSubsetTotal(attributeCount, largestSubsetSize) {
  let total = 0;

  for (
    let subsetSize = MIN_SUBSET_SIZE;
    subsetSize <= largestSubsetSize;
    subsetSize += 1
  ) {
    total += calculateBinomial(attributeCount, subsetSize);
  }

  return total;
}

/**
 * Visits every combination of `subsetSize` candidates in lexicographic index
 * order, so enumeration is deterministic for a given candidate order.
 */
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

function accumulateSubsetMetrics(accumulator, subsetSize, metrics) {
  let sums = accumulator.get(subsetSize);

  if (!sums) {
    sums = {
      evaluatedSubsetCount: 0,
      distinctionSum: 0,
      separationSum: 0,
      singletonFractionSum: 0,
    };
    accumulator.set(subsetSize, sums);
  }

  sums.evaluatedSubsetCount += 1;
  sums.distinctionSum += metrics.distinction || 0;
  sums.separationSum += metrics.separation || 0;
  sums.singletonFractionSum += metrics.singletonFraction || 0;
}

const mean = (sum, count) => (count ? sum / count : null);

/**
 * @returns {import("./subsetEvidenceSummary").SubsetSizeEvidence[]} Per-size
 * means, ordered by subset size.
 */
function materializeSubsetSizeEvidence(accumulator) {
  return Array.from(accumulator.entries())
    .sort(([left], [right]) => left - right)
    .map(([subsetSize, sums]) => ({
      subsetSize,
      evaluatedSubsetCount: sums.evaluatedSubsetCount,
      meanDistinction: mean(sums.distinctionSum, sums.evaluatedSubsetCount),
      meanSeparation: mean(sums.separationSum, sums.evaluatedSubsetCount),
      meanSingletonFraction: mean(
        sums.singletonFractionSum,
        sums.evaluatedSubsetCount
      ),
    }));
}

// The cache lives on the profiling source so metrics survive refreshes for
// the lifetime of the profiling session, and are discarded with it.
function getSessionSubsetCache(profilingSource) {
  if (!profilingSource.subsetPartitionCache) {
    profilingSource.subsetPartitionCache = new SubsetPartitionCache(
      profilingSource
    );
  }

  return profilingSource.subsetPartitionCache;
}

export function createEmptySubsetProfilingSummary(profilingConfiguration) {
  return createSubsetProfilingSummary(
    validateQidDiscoveryProfilingConfiguration(profilingConfiguration)
  );
}

/**
 * Exhaustively evaluates every eligible attribute subset of size
 * 2..effectiveMaxSubsetSize and streams each result into per-attribute, per-size
 * running sums. Individual subset metrics remain in the session cache for reuse;
 * only per-attribute, per-size aggregates leave this function. Large partitions
 * are temporary and released after the run.
 *
 * The safety limit is checked against the complete enumeration count, including
 * cache hits. Whole subset sizes are reduced until both limits fit. Every
 * combination at each retained size is evaluated; if even pairs cannot fit,
 * a limit error lets the caller explicitly skip subset profiling.
 *
 * @param {SubsetCandidateColumn[]} candidateColumns
 * @param {import("./profilingSource").ProfilingSource} profilingSource
 * @param {{ maxSubsetSize: number, maxEvaluatedSubsets: number }} profilingConfiguration
 * @returns {{
 *   evidenceBySourceField: Map<string, import("./subsetEvidenceSummary").SubsetSizeEvidence[]>,
 *   summary: SubsetProfilingSummary
 * }}
 */
export function profileAttributeSubsets(
  candidateColumns,
  profilingSource,
  profilingConfiguration
) {
  const { maxSubsetSize, maxEvaluatedSubsets } =
    validateQidDiscoveryProfilingConfiguration(profilingConfiguration);
  const candidateAttributeCount = candidateColumns.length;
  const requestedLargestSubsetSize = Math.min(maxSubsetSize, candidateAttributeCount);
  let largestSubsetSize = requestedLargestSubsetSize;
  let evaluatedSubsetCount = calculateEvaluatedSubsetTotal(
    candidateAttributeCount,
    largestSubsetSize
  );

  const recordCount = profilingSource?.recordCount || 0;
  const exceedsLimits = () =>
    evaluatedSubsetCount > maxEvaluatedSubsets ||
    evaluatedSubsetCount * recordCount > CSV_RESOURCE_LIMITS.maxSubsetRecordVisits;

  // Admit complete layers only; never keep a biased prefix of combinations.
  while (largestSubsetSize > MIN_SUBSET_SIZE && exceedsLimits()) {
    largestSubsetSize -= 1;
    evaluatedSubsetCount = calculateEvaluatedSubsetTotal(
      candidateAttributeCount,
      largestSubsetSize
    );
  }

  if (exceedsLimits()) {
    throw new SubsetProfilingLimitError(
      "Even all two-attribute combinations exceed the subset-count or browser work limit. Reduce the number of eligible attributes to enable subset profiling."
    );
  }
  const summary = createSubsetProfilingSummary({
    maxSubsetSize,
    maxEvaluatedSubsets,
    candidateAttributeCount,
    evaluatedSubsetCount,
    effectiveMaxSubsetSize: evaluatedSubsetCount ? largestSubsetSize : 0,
    adjusted: largestSubsetSize < requestedLargestSubsetSize,
  });
  // Per attribute: subsetSize -> running sums over every evaluated subset of
  // that size containing the attribute.
  const accumulatorsBySourceField = new Map(
    candidateColumns.map((candidate) => [candidate.sourceField, new Map()])
  );

  if (largestSubsetSize >= MIN_SUBSET_SIZE && profilingSource) {
    const subsetCache = getSessionSubsetCache(profilingSource);

    try {
      for (
        let subsetSize = MIN_SUBSET_SIZE;
        subsetSize <= largestSubsetSize;
        subsetSize += 1
      ) {
        enumerateSubsets(candidateColumns, subsetSize, (subsetColumns) => {
          const sourceFields = subsetColumns.map(
            (column) => column.sourceField
          );
          const metrics = subsetCache.getMetrics(sourceFields);

          sourceFields.forEach((sourceField) => {
            accumulateSubsetMetrics(
              accumulatorsBySourceField.get(sourceField),
              subsetSize,
              metrics
            );
          });
        });

        subsetCache.releasePartitionsSmallerThan(subsetSize);
      }
    } finally {
      subsetCache.releaseAllPartitions();
    }
  }

  return {
    evidenceBySourceField: new Map(
      Array.from(accumulatorsBySourceField.entries()).map(
        ([sourceField, accumulator]) => [
          sourceField,
          materializeSubsetSizeEvidence(accumulator),
        ]
      )
    ),
    summary,
  };
}
