import { buildColumnClassificationInput } from "./columnNameText";
import {
  AI_NAME_EVIDENCE_KINDS,
  AI_NAME_RULES_VERSION,
  getColumnNameEvidence,
} from "./columnNameRules";
import {
  getColumnClassifierModel,
  resolveColumnClassifierModel,
} from "./modelConfig";
import {
  AI_REVIEW_SUGGESTIONS,
  AI_SEMANTIC_CATEGORIES,
  isIdentifierCategory,
} from "./semanticCategories";
import { getModelThresholds } from "./thresholds";

/*
 * Column screening suggestions: interpretation of raw zero-shot output,
 * combination with column-name evidence, and the pure state transitions used
 * by the Add Dataset review UI.
 *
 * Two sources are kept separate on every suggestion and combined only for
 * the decision:
 * - the model (category, score, alternatives, modelStatus,
 *   modelUncertaintyReason, model), and
 * - column-name rules (nameEvidence, see columnNameRules.js).
 * `decisionSources` lists which of them support an exclusion. Value-pattern
 * evidence (profiling/directIdentifierEvidence.js) is a third, separate
 * source handled by directIdentifierPolicy.js.
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
 * Scores of different models (or prompt profiles) are not comparable; only
 * the semantic category ids are. A column's Distinguishability is not
 * evidence either way: a distinguishing attribute can be a quasi-identifier
 * or clinical value.
 *
 * What a model's prediction may do depends on its validation status
 * (modelConfig.js): only a model approved for automatic exclusion can exclude
 * a column without column-name evidence, and a model whose exact
 * configuration was never evaluated cannot clear a column from review.
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
  // Identifier prediction of a model not approved for automatic exclusion in
  // the exact configuration used.
  PROVISIONAL_MODEL: "PROVISIONAL_MODEL",
  // Non-identifier result from a model whose exact configuration has never
  // been evaluated: it cannot clear the column from review.
  MODEL_NOT_EVALUATED: "MODEL_NOT_EVALUATED",
  // The column name often holds a direct identifier ("name", "patient id").
  NAME_REVIEW: "NAME_REVIEW",
  // The model sees an identifier, but the name says the column is about one
  // ("email_consent") or is a common quasi-identifier ("zip code").
  NAME_CONTEXT: "NAME_CONTEXT",
  // An unambiguous identifier name, but the model confidently predicts a
  // non-identifier category.
  EVIDENCE_CONFLICT: "EVIDENCE_CONFLICT",
});

/**
 * Screening provenance recorded with a dataset: the model's registry id,
 * pinned revision and quantisation, prompt profile and fingerprint with the
 * column-name rules, thresholds profile and fingerprint, and validation
 * status. null for an unknown model.
 */
export function getAiScreeningProvenance(modelId) {
  const model = getColumnClassifierModel(modelId);
  if (!model) return null;
  return {
    modelId: model.id,
    repository: model.repository,
    revision: model.revision,
    dtype: model.dtype,
    promptVersion: `${model.promptVersion};${AI_NAME_RULES_VERSION}`,
    thresholdsVersion: model.thresholdsVersion,
    validationStatus: model.validationStatus,
  };
}

export const AI_DECISION_SOURCES = Object.freeze({
  MODEL: "model",
  COLUMN_NAME: "columnName",
});

// Model-only status, kept next to the combined `status`.
export const AI_MODEL_STATUS = Object.freeze({
  SUGGESTED: "suggested",
  UNCERTAIN: "uncertain",
  UNAVAILABLE: "unavailable",
});

const ALTERNATIVE_COUNT = 3;

const CATEGORY_BY_CONCEPT = new Map(
  AI_SEMANTIC_CATEGORIES.filter((category) => category.directIdentifierConcept).map(
    (category) => [category.directIdentifierConcept, category]
  )
);

function buildModelInfo(model) {
  return {
    registryId: model.id,
    displayName: model.displayName,
    repository: model.repository,
    revision: model.revision,
    dtype: model.dtype,
    version: model.version,
    promptVersion: model.promptVersion,
    thresholdsVersion: model.thresholdsVersion,
    configurationEvaluated: model.configurationEvaluated === true,
    autoExclusionApproved: model.autoExclusionApproved === true,
    validationStatus: model.validationStatus,
  };
}

function getUncertaintyReason(ranked, model) {
  const thresholds = getModelThresholds(model);
  const [top, second] = ranked;
  if (!top?.category) return AI_UNCERTAINTY_REASONS.ABSTAINED;
  if (top.category.reviewSuggestion === AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW) {
    return AI_UNCERTAINTY_REASONS.ABSTAINED;
  }
  if (top.score < thresholds.minTopScore) {
    return AI_UNCERTAINTY_REASONS.LOW_SCORE;
  }
  if (second && top.score - second.score < thresholds.minMargin) {
    return AI_UNCERTAINTY_REASONS.SMALL_MARGIN;
  }
  if (
    !isIdentifierCategory(top.category) &&
    ranked.some(
      (entry) =>
        isIdentifierCategory(entry.category) &&
        entry.score >= thresholds.maxIdentifierScoreBehindNonIdentifier
    )
  ) {
    return AI_UNCERTAINTY_REASONS.IDENTIFIER_NEARBY;
  }
  // Predictions of a model not approved for automatic exclusion never
  // exclude a column on their own: they stay suggestions for review.
  if (isIdentifierCategory(top.category)) {
    return model?.autoExclusionApproved === true
      ? null
      : AI_UNCERTAINTY_REASONS.PROVISIONAL_MODEL;
  }
  // The thresholds were never evaluated with this model and prompt, so a
  // "confident" non-identifier result means nothing either.
  if (model?.configurationEvaluated !== true) {
    return AI_UNCERTAINTY_REASONS.MODEL_NOT_EVALUATED;
  }
  return null;
}

/**
 * Combines the model's result with column-name evidence. Returns the
 * decision fields of a suggestion. Neither source can make a column "safe":
 * uncertain, unavailable or conflicting evidence always leads to review, and
 * weak names, quasi-identifiers or a distinguishing column never lead to an
 * automatic exclusion on their own.
 */
function combineEvidence(modelResult, nameEvidence) {
  const kinds = AI_NAME_EVIDENCE_KINDS;
  const modelAvailable = modelResult.status !== AI_MODEL_STATUS.UNAVAILABLE;
  const modelIdentifier =
    modelAvailable && isIdentifierCategory(modelResult.category);
  const modelConfident = modelResult.status === AI_MODEL_STATUS.SUGGESTED;
  const modelConfidentIdentifier = modelConfident && modelIdentifier;
  // An identifier result that only the model's validation status keeps from
  // being confident.
  const modelIdentifierPrediction =
    modelConfidentIdentifier ||
    (modelIdentifier &&
      modelResult.uncertaintyReason === AI_UNCERTAINTY_REASONS.PROVISIONAL_MODEL);
  const modelConfidentNonIdentifier =
    modelConfident &&
    modelResult.reviewSuggestion === AI_REVIEW_SUGGESTIONS.NO_EXCLUSION_SUGGESTED;
  const modelConcept = modelResult.category?.directIdentifierConcept || null;

  const exclude = (concept, sources) => ({
    status: AI_SUGGESTION_STATUS.SUGGESTED,
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    uncertaintyReason: null,
    directIdentifierConcept: concept,
    decisionSources: sources,
  });
  const review = (reason, concept, sources = []) => ({
    status: AI_SUGGESTION_STATUS.UNCERTAIN,
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW,
    uncertaintyReason: reason,
    directIdentifierConcept: concept,
    decisionSources: sources,
  });
  const modelOnly = () =>
    modelAvailable
      ? {
          status: modelResult.status,
          reviewSuggestion: modelResult.reviewSuggestion,
          uncertaintyReason: modelResult.uncertaintyReason,
          directIdentifierConcept: modelConcept,
          decisionSources: modelConfidentIdentifier ? [AI_DECISION_SOURCES.MODEL] : [],
        }
      : {
          status: AI_SUGGESTION_STATUS.UNAVAILABLE,
          reviewSuggestion: AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW,
          uncertaintyReason: null,
          directIdentifierConcept: null,
          decisionSources: [],
        };

  switch (nameEvidence?.kind) {
    case kinds.STRONG_IDENTIFIER:
      if (modelConfidentNonIdentifier) {
        return review(AI_UNCERTAINTY_REASONS.EVIDENCE_CONFLICT, nameEvidence.concept, [
          AI_DECISION_SOURCES.COLUMN_NAME,
        ]);
      }
      return exclude(
        nameEvidence.concept,
        modelIdentifier
          ? [AI_DECISION_SOURCES.COLUMN_NAME, AI_DECISION_SOURCES.MODEL]
          : [AI_DECISION_SOURCES.COLUMN_NAME]
      );
    case kinds.WEAK_IDENTIFIER:
      if (modelConfidentIdentifier) {
        return exclude(modelConcept, [
          AI_DECISION_SOURCES.MODEL,
          AI_DECISION_SOURCES.COLUMN_NAME,
        ]);
      }
      // The name is why the column is reviewed (the model's own reason stays
      // in modelUncertaintyReason). An unconfident model concept is not
      // shown as the column's concept: "record id" is a record key, not a
      // person name.
      return review(AI_UNCERTAINTY_REASONS.NAME_REVIEW, nameEvidence.concept, [
        AI_DECISION_SOURCES.COLUMN_NAME,
      ]);
    case kinds.IDENTIFIER_CONTEXT:
    case kinds.QUASI_IDENTIFIER:
      if (modelIdentifierPrediction) {
        return review(AI_UNCERTAINTY_REASONS.NAME_CONTEXT, modelConcept, [
          AI_DECISION_SOURCES.MODEL,
        ]);
      }
      return modelOnly();
    default:
      return modelOnly();
  }
}

function buildSuggestion({ columnKey, input, model, modelResult, error }) {
  const nameEvidence = getColumnNameEvidence(input.columnName);
  const decision = combineEvidence(modelResult, nameEvidence);
  return {
    columnKey,
    columnName: input.columnName,
    description: input.description || "",
    inputKey: input.cacheKey,
    // Model output.
    category: modelResult.category?.id || null,
    score: modelResult.score,
    alternatives: modelResult.alternatives,
    modelStatus: modelResult.status,
    modelUncertaintyReason: modelResult.uncertaintyReason,
    model: model ? buildModelInfo(model) : null,
    // Column-name evidence.
    nameEvidence,
    nameRulesVersion: AI_NAME_RULES_VERSION,
    // Combined decision.
    ...decision,
    error: error || null,
    review: null,
  };
}

/**
 * Converts a zero-shot pipeline result ({ labels, scores }, sorted by score)
 * into a structured suggestion for one column, combined with column-name
 * evidence.
 *
 * @param {Object} params
 * @param {string} params.columnKey Stable column identity (sourceField, or
 * field for manually added columns).
 * @param {ReturnType<typeof buildColumnClassificationInput>} params.input
 * @param {{ labels: string[], scores: number[] }} params.output
 * @param {string} params.modelId Registry id of the model that produced
 * `output`.
 */
export function interpretColumnClassification({ columnKey, input, output, modelId }) {
  const model = resolveColumnClassifierModel(modelId);
  if (!model) {
    throw new Error(`Unknown AI model: ${modelId}`);
  }
  // Labels are mapped back through the model's own prompt profile.
  const ranked = (output?.labels || []).map((label, index) => ({
    category: model.prompt.getCategoryByLabel(label),
    score: Number(output.scores?.[index]) || 0,
  }));
  const top = ranked[0] || null;
  const uncertaintyReason = getUncertaintyReason(ranked, model);
  const category = top?.category || null;

  return buildSuggestion({
    columnKey,
    input,
    model,
    modelResult: {
      status: uncertaintyReason ? AI_MODEL_STATUS.UNCERTAIN : AI_MODEL_STATUS.SUGGESTED,
      category,
      score: top ? top.score : null,
      alternatives: ranked.slice(1, 1 + ALTERNATIVE_COUNT).map((entry) => ({
        category: entry.category?.id || null,
        score: entry.score,
      })),
      reviewSuggestion: uncertaintyReason
        ? AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW
        : category.reviewSuggestion,
      uncertaintyReason,
    },
  });
}

/**
 * Suggestion for a column whose model classification could not run (model
 * files missing, unsupported browser, inference error, no model). Column-name
 * evidence still applies; without it the result is "unavailable", which never
 * implies "no identifier".
 */
export function buildUnavailableColumnSuggestion({ columnKey, input, error, modelId }) {
  const model = modelId === null ? null : resolveColumnClassifierModel(modelId);
  return buildSuggestion({
    columnKey,
    input,
    model,
    error,
    modelResult: {
      status: AI_MODEL_STATUS.UNAVAILABLE,
      category: null,
      score: null,
      alternatives: [],
      reviewSuggestion: AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW,
      uncertaintyReason: null,
    },
  });
}

/** Semantic category id for a direct-identifier concept (column-name rules). */
export function getCategoryForConcept(concept) {
  return CATEGORY_BY_CONCEPT.get(concept)?.id || null;
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
