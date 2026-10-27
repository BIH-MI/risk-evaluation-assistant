import { hasCompleteProfiling } from "features/qidDiscovery/profiling/profilingOutcome";
import { getUnresolvedScreening } from "features/qidDiscovery/ai/screeningStatus";

// Attributes named in the unresolved-review message before "n more".
const MAX_LISTED_REVIEWS = 8;

function buildUnresolvedReviewMessage(t, unresolved) {
  const listed = unresolved
    .slice(0, MAX_LISTED_REVIEWS)
    .map(({ tableName, attributeName }) => `${tableName}: ${attributeName}`);
  if (unresolved.length > MAX_LISTED_REVIEWS) {
    listed.push(
      t("datasets.alerts.unresolvedMore", {
        count: unresolved.length - MAX_LISTED_REVIEWS,
      })
    );
  }
  return t("datasets.alerts.unresolvedScreening", {
    attributes: listed.join(", "),
  });
}

/**
 * Returns the first blocking table/configuration/screening message, or "".
 * Name validation and backend error handling belong to useDatasetSubmission.
 * HIGH value-pattern identifiers must be excluded even after a manual override;
 * review-level name/value findings can be resolved by an explicit keep decision.
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
  // Potential direct identifiers that are still included need an explicit
  // decision (exclude, or confirm "keep included"); results still being
  // computed could add such findings.
  const { screeningTables, unresolved } = getUnresolvedScreening(
    tables,
    aiStateByTable,
    aiScreeningEnabled
  );
  if (screeningTables.length || unresolved.length) {
    return screeningTables.length
      ? t("datasets.alerts.screeningInProgress")
      : buildUnresolvedReviewMessage(t, unresolved);
  }

  return "";
}
