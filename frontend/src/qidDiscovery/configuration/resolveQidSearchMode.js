import {
  QID_SEARCH_TYPES,
  validateQidDiscoverySearchConfiguration,
} from "./validateQidDiscoverySearchConfiguration";

/**
 * Search type determines whether QID discovery uses Exact Search, Beam Search,
 * or selects between them automatically from the configured candidate-count
 * threshold.
 */
export function resolveQidSearchMode(candidateCount, searchConfiguration) {
  const configuration =
    validateQidDiscoverySearchConfiguration(searchConfiguration);

  switch (configuration.searchType) {
    case QID_SEARCH_TYPES.EXACT:
      return "exact";

    case QID_SEARCH_TYPES.BEAM:
      return "beam";

    case QID_SEARCH_TYPES.AUTOMATIC:
      return candidateCount <= configuration.exactSearchMaxCandidateCount
        ? "exact"
        : "beam";

    default:
      throw new Error("Unsupported QID Search Type.");
  }
}
