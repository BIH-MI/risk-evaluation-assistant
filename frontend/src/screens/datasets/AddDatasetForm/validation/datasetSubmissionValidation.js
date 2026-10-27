import { hasCompleteProfiling } from "features/qidDiscovery/profiling/profilingOutcome";
import { getTablesBeingScreened } from "features/qidDiscovery/ai/screeningStatus";

/**
 * Returns the first blocking table/configuration/screening message, or "".
 * Name validation and backend error handling belong to useDatasetSubmission.
 * HIGH value-pattern identifiers must be excluded even after a manual override;
 * review-level name/value findings are flagged in the preview but never block.
 * Uploaded tables require a successful profile, including valid zero-subset runs.
 */
export function validateDatasetSubmission({
  tables,
  selectedQidDiscoveryConfiguration,
  directIdentifierValidation,
  directIdentifierSubmissionMessage,
  aiStateByTable,
  aiScreeningEnabled,
  t,
}) {
  if (!selectedQidDiscoveryConfiguration) {
    return t("datasets.alerts.qidConfigurationRequiredForSubmit");
  }
  if (!tables.length) {
    return t("datasets.alerts.noTables");
  }
  if (tables.some((table) => table.isParsing || table.isProfiling)) {
    return t(
      "datasets.alerts.parsingInProgress",
      "Please wait until all CSV files finish parsing."
    );
  }
  if (tables.some((table) => !hasCompleteProfiling(table))) {
    return t("datasets.alerts.profileIncomplete",
      "An uploaded table has no successful profile. Resolve its profiling error or remove it and select the CSV again.");
  }
  if (!directIdentifierValidation.canSubmit) {
    return directIdentifierSubmissionMessage;
  }
  // Screening still running could still exclude attributes automatically.
  const screeningTables = getTablesBeingScreened(
    tables,
    aiStateByTable,
    aiScreeningEnabled
  );
  if (screeningTables.length) {
    return t("datasets.alerts.screeningInProgress");
  }

  return "";
}
