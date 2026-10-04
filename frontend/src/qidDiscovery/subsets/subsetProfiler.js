import { validateQidDiscoveryProfilingConfiguration } from "../configuration/validateQidDiscoveryProfilingConfiguration";
import { SubsetPartitionCache } from "./subsetPartitionCache";

/**
 * @typedef {Object} SubsetProfilingSummary
 * @property {number} maxSubsetSize Configured maximum subset size.
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

const MIN_SUBSET_SIZE = 2;

function createSubsetProfilingSummary({
  maxSubsetSize,
  maxEvaluatedSubsets,
  candidateAttributeCount = 0,
  evaluatedSubsetCount = 0,
}) {
  return {
    maxSubsetSize,
    maxEvaluatedSubsets,
    candidateAttributeCount,
    evaluatedSubsetCount,
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

/**
 * Running sums for one attribute: subsetSize -> sums over every evaluated
 * subset of that size containing the attribute.
 */
function createAttributeSubsetEvidenceAccumulator() {
  return new Map();
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
 * 2..maxSubsetSize and streams each result into per-attribute, per-size
 * running sums. Individual subset results are never retained: only aggregated
 * Distinguishability evidence leaves this function.
 *
 * @param {SubsetCandidateColumn[]} candidateColumns
 * @param {import("../profiling/profilingSource").ProfilingSource} profilingSource
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
  const largestSubsetSize = Math.min(maxSubsetSize, candidateAttributeCount);
  const evaluatedSubsetCount = calculateEvaluatedSubsetTotal(
    candidateAttributeCount,
    largestSubsetSize
  );

  if (evaluatedSubsetCount > maxEvaluatedSubsets) {
    throw new Error(
      `Subset profiling would evaluate ${evaluatedSubsetCount.toLocaleString()} subsets for ${candidateAttributeCount.toLocaleString()} eligible attributes, exceeding the configured limit of ${maxEvaluatedSubsets.toLocaleString()}. Reduce the maximum subset size or increase the evaluated-subset safety limit.`
    );
  }

  const summary = createSubsetProfilingSummary({
    maxSubsetSize,
    maxEvaluatedSubsets,
    candidateAttributeCount,
    evaluatedSubsetCount,
  });
  const accumulatorsBySourceField = new Map(
    candidateColumns.map((candidate) => [
      candidate.sourceField,
      createAttributeSubsetEvidenceAccumulator(),
    ])
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
