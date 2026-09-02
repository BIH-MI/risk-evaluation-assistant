export const QID_SEARCH_TYPES = Object.freeze({
  AUTOMATIC: "AUTOMATIC",
  EXACT: "EXACT",
  BEAM: "BEAM",
});

const SEARCH_TYPE_VALUES = new Set(Object.values(QID_SEARCH_TYPES));

function requireSearchConfiguration(searchConfiguration) {
  if (!searchConfiguration || typeof searchConfiguration !== "object") {
    throw new Error("QID discovery search configuration is required.");
  }
}

function toNumber(value, label, { required = true, min, max } = {}) {
  if (value === null || value === undefined || value === "") {
    if (!required) return null;
    throw new Error(`${label} is required.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (min !== undefined && number < min) {
    throw new Error(`${label} must be greater than or equal to ${min}.`);
  }
  if (max !== undefined && number > max) {
    throw new Error(`${label} must be less than or equal to ${max}.`);
  }

  return number;
}

function toInteger(value, label, options) {
  const number = toNumber(value, label, options);
  if (number === null) return null;
  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be an integer.`);
  }
  return number;
}

function normalizeSearchType(value) {
  const searchType = String(value || "")
    .trim()
    .toUpperCase();

  if (!SEARCH_TYPE_VALUES.has(searchType)) {
    throw new Error("QID Search Type must be Automatic, Exact, or Beam.");
  }

  return searchType;
}

export function validateQidDiscoverySearchConfiguration(searchConfiguration) {
  requireSearchConfiguration(searchConfiguration);

  const searchType = normalizeSearchType(searchConfiguration.searchType);
  const normalized = {
    searchType,
    exactSearchMaxCandidateCount: toInteger(
      searchConfiguration.exactSearchMaxCandidateCount,
      "Exact Search Maximum Candidate Count",
      {
        required: searchType === QID_SEARCH_TYPES.AUTOMATIC,
        min: 1,
      }
    ),
    maxCombinationSize: toInteger(
      searchConfiguration.maxCombinationSize,
      "Maximum Combination Size",
      { min: 1 }
    ),
    beamWidth: toInteger(searchConfiguration.beamWidth, "Beam Width", {
      required:
        searchType === QID_SEARCH_TYPES.AUTOMATIC ||
        searchType === QID_SEARCH_TYPES.BEAM,
      min: 1,
    }),
    minImprovement: toNumber(
      searchConfiguration.minImprovement,
      "Minimum Improvement",
      {
        required:
          searchType === QID_SEARCH_TYPES.AUTOMATIC ||
          searchType === QID_SEARCH_TYPES.BEAM,
        min: 0,
      }
    ),
    stagnationDepthLimit: toInteger(
      searchConfiguration.stagnationDepthLimit,
      "Stagnation Depth Limit",
      {
        required:
          searchType === QID_SEARCH_TYPES.AUTOMATIC ||
          searchType === QID_SEARCH_TYPES.BEAM,
        min: 1,
      }
    ),
    targetDistinction: toNumber(
      searchConfiguration.targetDistinction,
      "Target Distinction",
      { min: 0, max: 1 }
    ),
    targetSeparation: toNumber(
      searchConfiguration.targetSeparation,
      "Target Separation",
      { min: 0, max: 1 }
    ),
    distinctionWeight: toNumber(
      searchConfiguration.distinctionWeight,
      "Distinction Weight",
      { min: 0 }
    ),
    separationWeight: toNumber(
      searchConfiguration.separationWeight,
      "Separation Weight",
      { min: 0 }
    ),
    attributeCountPenalty: toNumber(
      searchConfiguration.attributeCountPenalty,
      "Attribute Count Penalty",
      { min: 0 }
    ),
    maxPersistedCombinations: toInteger(
      searchConfiguration.maxPersistedCombinations,
      "Maximum Retained Combinations",
      { min: 1 }
    ),
  };

  if (normalized.distinctionWeight + normalized.separationWeight <= 0) {
    throw new Error(
      "Distinction Weight and Separation Weight cannot both be 0."
    );
  }

  return normalized;
}
