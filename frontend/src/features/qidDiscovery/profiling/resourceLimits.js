/** Conservative browser admission limits, not a guarantee of capacity on every device.
 * Reject excess work rather than sampling records or truncating scientific results.
 */
export const CSV_RESOURCE_LIMITS = Object.freeze({
  maxFileBytes: 50 * 1024 * 1024,
  maxRows: 100000,
  maxColumns: 100,
  maxCells: 2000000,
  maxSubsetRecordVisits: 50000000,
});

export function requireCsvFileWithinLimits(file) {
  if (!file || file.size > CSV_RESOURCE_LIMITS.maxFileBytes) {
    throw new Error(
      "CSV files must be at most 50 MiB. Select a smaller file; no rows have been sampled or discarded."
    );
  }
}
