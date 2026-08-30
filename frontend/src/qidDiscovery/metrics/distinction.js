/**
 * Distinction is the number of equivalence classes divided by the number of
 * analysed records. It is quantitative evidence from the uploaded table, not
 * a final re-identification probability.
 */
export function calculateDistinction(
  equivalenceClassCount,
  analysedRecordCount
) {
  if (!analysedRecordCount) return 0;
  return equivalenceClassCount / analysedRecordCount;
}
