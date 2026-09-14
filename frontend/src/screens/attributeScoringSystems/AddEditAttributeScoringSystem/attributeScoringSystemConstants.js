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

/**
 * Translation keys for the predefined score labels, keyed by the label's
 * internal/persisted English value. The English value itself stays the
 * source of truth for storage, ordering and uniqueness checks — only the
 * rendered text is localized.
 */
export const SCORE_LABEL_TRANSLATION_KEYS = Object.freeze({
  Low: "attributeScoringSystems.scoreOptions.labels.low",
  Moderate: "attributeScoringSystems.scoreOptions.labels.moderate",
  High: "attributeScoringSystems.scoreOptions.labels.high",
  "Very High": "attributeScoringSystems.scoreOptions.labels.veryHigh",
  Critical: "attributeScoringSystems.scoreOptions.labels.critical",
});

export const MIN_SCORE_OPTIONS_PER_DIMENSION = 2;

export const MAX_SCORE_OPTIONS_PER_DIMENSION = SCORE_LABEL_ORDER.length;

export const MIN_SCORE_VALUE = 0;
