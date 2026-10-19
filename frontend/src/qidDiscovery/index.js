// Public API of the QID Discovery feature. Code outside qidDiscovery/ uses
// these entry points; every other module here is an implementation detail:
//
// - "qidDiscovery" (this file): pure, side-effect-free helpers that are safe
//   to import anywhere, including assessment screens and tests.
// - "qidDiscovery/workerClient": uploaded-table profiling. Kept separate
//   because it owns the QID Web Worker (bundled via import.meta.url), which
//   should not be pulled into modules that only need the helpers below.
// - "qidDiscovery/aiSuggestions": pure helpers for optional AI column-name
//   suggestions (categories, statuses, review transitions).
// - "qidDiscovery/aiSuggestions/columnClassifierClient": owns the AI Web
//   Worker that lazily loads the self-hosted zero-shot model.

// QID Discovery Configuration.
export { DEFAULT_QID_DISCOVERY_PROFILING_CONFIGURATION } from "./configuration/defaults";
export { getQidConfigurationValidationError } from "./configuration/validateQidDiscoveryProfilingConfiguration";

// Direct Identifier policy for dataset schema editing.
export {
  applyDirectIdentifierEvidenceDefaults,
  applySchemaDirectIdentifierEvidence,
  buildDirectIdentifierOverrideWarning,
  buildDirectIdentifierReviewMessage,
  buildDirectIdentifierSubmissionMessage,
  isDefaultExcludedIdentifierColumn,
  validateDirectIdentifierExclusions,
} from "./directIdentifierPolicy";

// Persistence mapping and Distinguishability evidence summaries.
export { toDatasetAttributePayload } from "./payload";
export { summarizeSubsetEvidence } from "./subsets/subsetEvidenceSummary";
