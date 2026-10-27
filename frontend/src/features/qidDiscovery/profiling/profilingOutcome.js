/** Local workflow outcomes; never infer success merely from a cleared busy flag. */
export const PROFILING_OUTCOME = Object.freeze({
  PREPARING: "preparing",
  AWAITING_SCREENING: "awaitingScreening",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  SCHEMA_ONLY: "schemaOnly",
});

/** Manual schemas are intentional; uploaded tables must finish even a zero-subset run. */
export function hasCompleteProfiling(table) {
  if (table.isManual === true) return true;
  return (
    table.profilingOutcome === PROFILING_OUTCOME.SUCCEEDED &&
    table.subsetProfilingSummary != null
  );
}

/** Merge computed evidence only, keeping all current researcher-owned metadata. */
export function mergeProfileEvidence(currentColumns, profiledColumns) {
  const bySource = new Map(
    profiledColumns.map((column) => [
      column.sourceField || column.field,
      column,
    ])
  );
  return currentColumns.map((column) => {
    const computed = bySource.get(column.sourceField || column.field);
    if (!computed) return column; // An unobserved attribute may have been added mid-run.
    return {
      ...column,
      statistics: computed.statistics,
      directIdentifierEvidence: computed.directIdentifierEvidence,
      subsetEvidence: computed.subsetEvidence,
      hasObservedData: computed.hasObservedData,
    };
  });
}
