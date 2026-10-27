/**
 * @typedef {Object} SubsetSizeEvidence
 * @property {number} subsetSize
 * @property {number} evaluatedSubsetCount
 * @property {number} meanDistinction
 * @property {number} meanSeparation
 * @property {number} meanSingletonFraction
 */

const hasValue = (value) => value !== null && value !== undefined;

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const meanAvailable = (values) => {
  const numericValues = values
    .map(toFiniteNumber)
    .filter((value) => value !== null);

  return numericValues.length
    ? numericValues.reduce((sum, value) => sum + value, 0) /
        numericValues.length
    : null;
};

/**
 * Summarizes per-size subset evidence into contextual attribute evidence.
 *
 * Each subset size contributes one mean value, regardless of how many
 * individual subsets exist at that size. This preserves the current
 * methodology: contextual Distinguishability is the average of available
 * per-size means, not the mean across all evaluated subset combinations.
 */
export function summarizeSubsetEvidence(subsetEvidence = []) {
  const bySubsetSize = subsetEvidence
    .filter((evidence) => hasValue(evidence?.subsetSize))
    .slice()
    .sort((left, right) => Number(left.subsetSize) - Number(right.subsetSize));

  if (!bySubsetSize.length) return null;

  return {
    evaluatedSubsetCount: bySubsetSize.reduce(
      (sum, evidence) =>
        sum + (toFiniteNumber(evidence.evaluatedSubsetCount) || 0),
      0
    ),
    maxSubsetSize: Number(bySubsetSize[bySubsetSize.length - 1].subsetSize),
    meanDistinction: meanAvailable(
      bySubsetSize.map((evidence) => evidence.meanDistinction)
    ),
    meanSeparation: meanAvailable(
      bySubsetSize.map((evidence) => evidence.meanSeparation)
    ),
    meanSingletonFraction: meanAvailable(
      bySubsetSize.map((evidence) => evidence.meanSingletonFraction)
    ),
  };
}
