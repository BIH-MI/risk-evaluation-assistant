import { buildColumnClassificationInput } from "./columnNameText";
import {
  AI_COLUMN_CLASSIFIER_MODEL,
  AI_COLUMN_CLASSIFIER_VERSION,
} from "./modelConfig";
import {
  AI_REVIEW_SUGGESTIONS,
  getSemanticCategoryByLabel,
  isIdentifierCategory,
} from "./semanticCategories";

/*
 * AI column suggestions: interpretation of raw zero-shot output and the pure
 * state transitions used by the Add Dataset review UI.
 *
 * Suggestions are frontend-local. They are never stored in
 * `directIdentifierEvidence` and never persisted. In Add Dataset, a confident
 * identifier suggestion (status "suggested" + SUGGEST_EXCLUSION_REVIEW)
 * excludes the column automatically via a separate `aiAutoExcluded` flag;
 * explicit researcher decisions (accept, reject, or the checkbox) always take
 * precedence. Only the final `excluded` value is persisted.
 *
 * The model score is the zero-shot softmax score of the top candidate label
 * among the fixed label set. It is not a calibrated probability that the
 * column is an identifier, and not a measure of re-identification risk.
 */

export const AI_SUGGESTION_STATUS = Object.freeze({
  SUGGESTED: "suggested",
  UNCERTAIN: "uncertain",
  REVIEWED: "reviewed",
  UNAVAILABLE: "unavailable",
});

export const AI_REVIEW_DECISIONS = Object.freeze({
  // Exclusion suggestion accepted: the column was excluded.
  ACCEPTED: "ACCEPTED",
  // Exclusion suggestion rejected: the column stays included.
  REJECTED: "REJECTED",
  // No exclusion was suggested; the researcher acknowledged the suggestion.
  ACKNOWLEDGED: "ACKNOWLEDGED",
  // The researcher changed the exclusion checkbox directly.
  MANUAL: "MANUAL",
});

export const AI_UNCERTAINTY_REASONS = Object.freeze({
  ABSTAINED: "ABSTAINED",
  LOW_SCORE: "LOW_SCORE",
  SMALL_MARGIN: "SMALL_MARGIN",
  IDENTIFIER_NEARBY: "IDENTIFIER_NEARBY",
});

// Abstention thresholds on the (uncalibrated) zero-shot score. They were set
// conservatively from manual inspection of typical clinical column names: a
// suggestion is only "suggested" when one label clearly dominates. Anything
// else is "uncertain" and left to the researcher.
export const AI_SUGGESTION_THRESHOLDS = Object.freeze({
  minTopScore: 0.5,
  minMargin: 0.2,
  // A non-identifier winner is still uncertain when an identifier-like label
  // scores at least this much: an unrecognised column is never assumed safe.
  maxIdentifierScoreBehindNonIdentifier: 0.25,
});

const ALTERNATIVE_COUNT = 3;

function buildModelInfo() {
  return {
    id: AI_COLUMN_CLASSIFIER_MODEL.modelId,
    revision: AI_COLUMN_CLASSIFIER_MODEL.revision,
    dtype: AI_COLUMN_CLASSIFIER_MODEL.dtype,
    version: AI_COLUMN_CLASSIFIER_VERSION,
  };
}

function getUncertaintyReason(ranked) {
  const [top, second] = ranked;
  if (!top?.category) return AI_UNCERTAINTY_REASONS.ABSTAINED;
  if (top.category.reviewSuggestion === AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW) {
    return AI_UNCERTAINTY_REASONS.ABSTAINED;
  }
  if (top.score < AI_SUGGESTION_THRESHOLDS.minTopScore) {
    return AI_UNCERTAINTY_REASONS.LOW_SCORE;
  }
  if (second && top.score - second.score < AI_SUGGESTION_THRESHOLDS.minMargin) {
    return AI_UNCERTAINTY_REASONS.SMALL_MARGIN;
  }
  if (
    !isIdentifierCategory(top.category) &&
    ranked.some(
      (entry) =>
        isIdentifierCategory(entry.category) &&
        entry.score >=
          AI_SUGGESTION_THRESHOLDS.maxIdentifierScoreBehindNonIdentifier
    )
  ) {
    return AI_UNCERTAINTY_REASONS.IDENTIFIER_NEARBY;
  }
  return null;
}

/**
 * Converts a zero-shot pipeline result ({ labels, scores }, sorted by score)
 * into a structured suggestion for one column.
 *
 * @param {Object} params
 * @param {string} params.columnKey Stable column identity (sourceField, or
 * field for manually added columns).
 * @param {ReturnType<typeof buildColumnClassificationInput>} params.input
 * @param {{ labels: string[], scores: number[] }} params.output
 */
export function interpretColumnClassification({ columnKey, input, output }) {
  const ranked = (output?.labels || []).map((label, index) => ({
    category: getSemanticCategoryByLabel(label),
    score: Number(output.scores?.[index]) || 0,
  }));
  const top = ranked[0] || null;
  const uncertaintyReason = getUncertaintyReason(ranked);
  const category = top?.category || null;

  return {
    columnKey,
    columnName: input.columnName,
    description: input.description || "",
    inputKey: input.cacheKey,
    category: category?.id || null,
    score: top ? top.score : null,
    alternatives: ranked.slice(1, 1 + ALTERNATIVE_COUNT).map((entry) => ({
      category: entry.category?.id || null,
      score: entry.score,
    })),
    reviewSuggestion: uncertaintyReason
      ? AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW
      : category.reviewSuggestion,
    directIdentifierConcept: category?.directIdentifierConcept || null,
    model: buildModelInfo(),
    status: uncertaintyReason
      ? AI_SUGGESTION_STATUS.UNCERTAIN
      : AI_SUGGESTION_STATUS.SUGGESTED,
    uncertaintyReason,
    review: null,
  };
}

/**
 * Placeholder for a column whose classification could not run (model assets
 * missing, unsupported browser, inference error). Unavailable never implies
 * "no identifier".
 */
export function buildUnavailableColumnSuggestion({ columnKey, input, error }) {
  return {
    columnKey,
    columnName: input.columnName,
    description: input.description || "",
    inputKey: input.cacheKey,
    category: null,
    score: null,
    alternatives: [],
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW,
    directIdentifierConcept: null,
    model: buildModelInfo(),
    status: AI_SUGGESTION_STATUS.UNAVAILABLE,
    uncertaintyReason: null,
    error: error || null,
    review: null,
  };
}

/** True when the suggestion proposes reviewing an exclusion. */
export function suggestsExclusionReview(suggestion) {
  return (
    suggestion?.reviewSuggestion ===
    AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW
  );
}

/**
 * True while the suggestion still asks the researcher for an exclusion
 * decision: identifier-like suggestions and uncertain classifications.
 * Non-identifier suggestions do not block the "reviewed" state of the table.
 */
export function needsResearcherReview(suggestion) {
  if (!suggestion) return false;
  if (suggestion.status === AI_SUGGESTION_STATUS.UNCERTAIN) return true;
  return (
    suggestion.status === AI_SUGGESTION_STATUS.SUGGESTED &&
    suggestsExclusionReview(suggestion)
  );
}

/**
 * Records a researcher decision. `previousExcluded` is kept so that rejecting
 * a previously accepted suggestion can restore the original exclusion.
 */
export function markSuggestionReviewed(suggestion, decision, previousExcluded) {
  if (!suggestion) return suggestion;

  const priorReview = suggestion.review;
  return {
    ...suggestion,
    status: AI_SUGGESTION_STATUS.REVIEWED,
    review: {
      decision,
      reviewedStatus:
        priorReview?.reviewedStatus ??
        (suggestion.status === AI_SUGGESTION_STATUS.REVIEWED
          ? AI_SUGGESTION_STATUS.SUGGESTED
          : suggestion.status),
      previousExcluded: priorReview
        ? priorReview.previousExcluded
        : Boolean(previousExcluded),
    },
  };
}

/**
 * A suggestion only applies to the exact input it was computed for. After a
 * rename or description change it is stale and must not be displayed or acted
 * upon.
 */
export function isSuggestionCurrent(suggestion, { columnName, description }) {
  if (!suggestion) return false;
  const input = buildColumnClassificationInput({ columnName, description });
  return (
    suggestion.columnName === input.columnName &&
    suggestion.inputKey === input.cacheKey
  );
}
