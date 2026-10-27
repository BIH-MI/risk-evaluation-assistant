/**
 * Separation is the fraction of unordered record pairs distinguished by an
 * attribute or attribute combination. It does not determine whether these
 * variables are externally available to an attacker or are final QIDs.
 */
export function calculateSeparation(classSizes = [], analysedRecordCount) {
  if (!analysedRecordCount || analysedRecordCount < 2) return 0;

  const totalPairs = (analysedRecordCount * (analysedRecordCount - 1)) / 2;
  const indistinguishablePairs = classSizes.reduce(
    (sum, size) => sum + (size * (size - 1)) / 2,
    0
  );

  return 1 - indistinguishablePairs / totalPairs;
}
