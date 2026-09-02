export const ATTRIBUTE_DIMENSIONS = Object.freeze([
  { key: "replicability", label: "Replicability" },
  { key: "availability", label: "Availability" },
  { key: "distinguishability", label: "Distinguishability" },
  { key: "sensitivity", label: "Sensitivity" },
]);

/**
 * Score labels currently use REA's supported ordinal vocabulary.
 * Changing this list changes the scoring-system domain contract rather than
 * merely the editor UI.
 */
export const SCORE_LABEL_ORDER = Object.freeze([
  "Low",
  "Moderate",
  "High",
  "Very High",
  "Critical",
]);

export const SCORE_LABEL_RANK = Object.freeze(
  SCORE_LABEL_ORDER.reduce((rankByLabel, label, index) => {
    rankByLabel[label.toLowerCase()] = index;
    return rankByLabel;
  }, {})
);

export const PREDEFINED_SCORE_LABELS = SCORE_LABEL_ORDER;

export const MIN_SCORE_OPTIONS_PER_DIMENSION = 2;

export const MAX_SCORE_OPTIONS_PER_DIMENSION = SCORE_LABEL_ORDER.length;

export const MIN_SCORE_VALUE = 0;
