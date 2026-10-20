import {
  AI_DECISION_SOURCES,
  AI_ERROR_CODES,
  AI_MODEL_STATUS,
  AI_SUGGESTION_STATUS,
  AI_UNCERTAINTY_REASONS,
  getCategoryForConcept,
  isGeneralUncertainty,
  isSuggestionCurrent,
  needsResearcherReview,
} from "qidDiscovery/aiSuggestions";
import { AI_TABLE_STATUS } from "./aiSuggestionTableState";

/*
 * Direct-identifier screening status of one Add Dataset column, derived from
 * the column metadata, its current AI suggestion and its value-pattern
 * evidence. Shared by the table's status indicator, its tooltip, the legend,
 * the review count and submission validation, so they never disagree.
 *
 * Reported per column:
 * - prediction: what the screening detected (category, whether the
 *   prediction itself is uncertain);
 * - evidence: only the sources that produced the result;
 * - review: whether a researcher decision is still required. It is required
 *   only for an included column with a potential direct-identifier finding
 *   (review-level value pattern, or an AI/column-name result for which
 *   needsResearcherReview() is true), and blocks submission until resolved.
 *   Excluded columns need no decision; an automatic exclusion can still be
 *   confirmed. Only an explicit researcher decision (checkbox change or
 *   confirmation, recorded as `manualExclusionDecision`) completes a review;
 *   finished inference or opening the details never does.
 *
 * `status` is the single primary indicator derived from them.
 */

export const SCREENING_STATUS = Object.freeze({
  REVIEW_NEEDED: "reviewNeeded",
  AUTO_EXCLUDED: "autoExcluded",
  REVIEWED: "reviewed",
  NO_EXCLUSION_SUGGESTED: "noExclusionSuggested",
  NOT_SCREENED: "notScreened",
  PENDING: "pending",
});

// Statuses shown in the legend, in display order.
export const SCREENING_LEGEND_STATUSES = Object.freeze([
  SCREENING_STATUS.REVIEW_NEEDED,
  SCREENING_STATUS.AUTO_EXCLUDED,
  SCREENING_STATUS.REVIEWED,
  SCREENING_STATUS.NO_EXCLUSION_SUGGESTED,
  SCREENING_STATUS.NOT_SCREENED,
]);

export const REVIEW_STATE = Object.freeze({
  REQUIRED: "required",
  COMPLETED: "completed",
  NOT_REQUIRED: "notRequired",
});

export const SCREENING_SOURCES = Object.freeze({
  COLUMN_NAME: "columnName",
  // A model approved for automatic exclusion.
  MODEL: "model",
  // Any other model result: a suggestion, never the cause of an exclusion.
  AI_SUGGESTION: "aiSuggestion",
  VALUE_PATTERN: "valuePattern",
});

export const NOT_SCREENED_REASONS = Object.freeze({
  DISABLED: "disabled",
  MANUAL_TABLE: "manualTable",
  MODEL_UNAVAILABLE: "modelUnavailable",
  LOAD_FAILED: "loadFailed",
  TIMED_OUT: "timedOut",
  FAILED: "failed",
  NOT_RUN: "notRun",
});

const MODEL_UNAVAILABLE_CODES = new Set([
  AI_ERROR_CODES.NO_MODEL_AVAILABLE,
  AI_ERROR_CODES.WORKER_UNAVAILABLE,
]);

// Explanation per uncertainty reason (datasets.aiSuggestions.tooltip.message).
const REVIEW_MESSAGES = {
  [AI_UNCERTAINTY_REASONS.PROVISIONAL_MODEL]: "provisionalIdentifier",
  [AI_UNCERTAINTY_REASONS.NAME_REVIEW]: "nameReview",
  [AI_UNCERTAINTY_REASONS.NAME_CONTEXT]: "nameContext",
  [AI_UNCERTAINTY_REASONS.EVIDENCE_CONFLICT]: "evidenceConflict",
};

// Model results whose category is the model's real prediction, only not
// trusted for this configuration.
const UNTRUSTED_PREDICTION_REASONS = new Set([
  AI_UNCERTAINTY_REASONS.PROVISIONAL_MODEL,
  AI_UNCERTAINTY_REASONS.MODEL_NOT_EVALUATED,
]);

// The status the screening produced, before any researcher review.
function getPredictionStatus(suggestion) {
  if (suggestion?.status === AI_SUGGESTION_STATUS.REVIEWED) {
    return suggestion.review?.reviewedStatus || AI_SUGGESTION_STATUS.SUGGESTED;
  }
  return suggestion?.status || null;
}

function getNotScreenedReason({ suggestion, aiState, aiEnabled, isManualTable }) {
  if (isManualTable) return NOT_SCREENED_REASONS.MANUAL_TABLE;
  if (!aiEnabled) return NOT_SCREENED_REASONS.DISABLED;
  const code = suggestion?.error?.code || aiState?.error?.code;
  if (MODEL_UNAVAILABLE_CODES.has(code)) return NOT_SCREENED_REASONS.MODEL_UNAVAILABLE;
  if (code === AI_ERROR_CODES.MODEL_LOAD_FAILED) return NOT_SCREENED_REASONS.LOAD_FAILED;
  if (code === AI_ERROR_CODES.TIMEOUT) return NOT_SCREENED_REASONS.TIMED_OUT;
  if (code) return NOT_SCREENED_REASONS.FAILED;
  return NOT_SCREENED_REASONS.NOT_RUN;
}

/**
 * Predicted semantic category to show: the identifier concept the decision
 * is based on, else the model's category when it is a real prediction.
 * null with `nameOnly` for a name reviewed without a concept (record keys);
 * null otherwise when the prediction is too uncertain to name a category.
 */
function getPredictedCategory(suggestion) {
  if (!suggestion || suggestion.status === AI_SUGGESTION_STATUS.UNAVAILABLE) {
    return { category: null, nameOnly: false };
  }
  const conceptCategory = getCategoryForConcept(suggestion.directIdentifierConcept);
  if (suggestion.uncertaintyReason === AI_UNCERTAINTY_REASONS.NAME_REVIEW) {
    return { category: conceptCategory, nameOnly: !conceptCategory };
  }
  // A concept from a low-score or close-margin model result is not a
  // prediction worth naming; the result is shown as uncertain instead.
  const reason = suggestion.uncertaintyReason;
  if (conceptCategory && (!reason || REVIEW_MESSAGES[reason])) {
    return { category: conceptCategory, nameOnly: false };
  }
  if (
    suggestion.modelStatus === AI_MODEL_STATUS.SUGGESTED ||
    UNTRUSTED_PREDICTION_REASONS.has(suggestion.modelUncertaintyReason)
  ) {
    return { category: suggestion.category, nameOnly: false };
  }
  return { category: null, nameOnly: false };
}

function getModelSource(suggestion) {
  return suggestion?.model?.autoExclusionApproved === true
    ? SCREENING_SOURCES.MODEL
    : SCREENING_SOURCES.AI_SUGGESTION;
}

// Sources the combined AI decision was based on (column name, model).
function getDecisionSources(suggestion) {
  return (suggestion?.decisionSources || []).map((source) =>
    source === AI_DECISION_SOURCES.COLUMN_NAME
      ? SCREENING_SOURCES.COLUMN_NAME
      : getModelSource(suggestion)
  );
}

// Sources behind a result that did not exclude automatically: the decision
// sources, the model when it gave an actual classification (not a
// low-confidence one), and value patterns.
function getResultSources(suggestion, valueEvidence) {
  const sources = getDecisionSources(suggestion);
  const modelSource = getModelSource(suggestion);
  if (
    !sources.includes(modelSource) &&
    (suggestion?.modelStatus === AI_MODEL_STATUS.SUGGESTED ||
      UNTRUSTED_PREDICTION_REASONS.has(suggestion?.modelUncertaintyReason))
  ) {
    sources.push(modelSource);
  }
  if (valueEvidence?.detected || valueEvidence?.requiresReview) {
    sources.push(SCREENING_SOURCES.VALUE_PATTERN);
  }
  return sources;
}

/**
 * Screening status of one column.
 *
 * @param {Object} params
 * @param {Object} params.column Column metadata (excluded, aiAutoExcluded,
 *   autoExcludedDirectIdentifier, manualExclusionDecision,
 *   directIdentifierEvidence).
 * @param {Object|null} params.suggestion Current AI suggestion (null when
 *   none applies to the column's current name and description).
 * @param {Object} params.aiState The table's AI state (status, error).
 * @param {boolean} params.aiEnabled AI screening is enabled for the form.
 * @param {boolean} params.isAiRunning Classification is in progress.
 * @param {boolean} params.isManualTable Manually added table (not screened).
 */
export function getColumnScreening({
  column = {},
  suggestion = null,
  aiState = null,
  aiEnabled = true,
  isAiRunning = false,
  isManualTable = false,
}) {
  const valueEvidence = column.directIdentifierEvidence || null;
  const excluded = column.excluded === true;
  const decided =
    column.manualExclusionDecision === true ||
    suggestion?.status === AI_SUGGESTION_STATUS.REVIEWED;
  const aiAutoExcluded = excluded && column.aiAutoExcluded === true;
  // Confirmed (HIGH) value-pattern evidence excludes without confirmation.
  const valueAutoExcluded =
    excluded &&
    !aiAutoExcluded &&
    column.autoExcludedDirectIdentifier === true &&
    valueEvidence?.detected === true;
  const valueReview = valueEvidence?.requiresReview === true && !valueEvidence.detected;
  const unscreened = !suggestion || suggestion.status === AI_SUGGESTION_STATUS.UNAVAILABLE;
  const pending = !suggestion && isAiRunning && !isManualTable && !decided;

  let review = REVIEW_STATE.NOT_REQUIRED;
  if (decided) {
    review = REVIEW_STATE.COMPLETED;
  } else if (!excluded && (valueReview || needsResearcherReview(suggestion))) {
    review = REVIEW_STATE.REQUIRED;
  }

  const notScreenedReason = unscreened
    ? getNotScreenedReason({ suggestion, aiState, aiEnabled, isManualTable })
    : null;
  const predictionStatus = getPredictionStatus(suggestion);
  const { category, nameOnly } = getPredictedCategory(suggestion);

  let status;
  let message;
  let evidence = [];
  if (pending) {
    status = SCREENING_STATUS.PENDING;
    message = "pending";
  } else if ((aiAutoExcluded || valueAutoExcluded) && !decided) {
    status = SCREENING_STATUS.AUTO_EXCLUDED;
    if (valueAutoExcluded) {
      evidence = [SCREENING_SOURCES.VALUE_PATTERN];
      message = "autoExcludedByValuePattern";
    } else {
      evidence = getDecisionSources(suggestion);
      const byName = evidence.includes(SCREENING_SOURCES.COLUMN_NAME);
      // Only an approved model is a cause; otherwise it merely agreed.
      const byModel = evidence.includes(SCREENING_SOURCES.MODEL);
      message =
        byName && byModel
          ? "autoExcludedByNameAndModel"
          : byName
          ? "autoExcludedByName"
          : byModel
          ? "autoExcludedByModel"
          : "autoExcluded";
    }
  } else if (review === REVIEW_STATE.REQUIRED) {
    status = SCREENING_STATUS.REVIEW_NEEDED;
    const aiReview = needsResearcherReview(suggestion);
    message = !aiReview
      ? "valuePatternReview"
      : isGeneralUncertainty(suggestion)
      ? // Uncertain, but the model's top category is an identifier.
        "possibleIdentifier"
      : REVIEW_MESSAGES[suggestion.uncertaintyReason] ||
        // An identifier suggestion that was not applied automatically.
        "identifierNotExcluded";
  } else if (review === REVIEW_STATE.COMPLETED) {
    status = SCREENING_STATUS.REVIEWED;
    message = excluded ? "reviewedExcluded" : "reviewedIncluded";
  } else if (unscreened && !valueAutoExcluded) {
    status = SCREENING_STATUS.NOT_SCREENED;
    message = `notScreened.${notScreenedReason}`;
  } else {
    status = SCREENING_STATUS.NO_EXCLUSION_SUGGESTED;
    message = !isGeneralUncertainty(suggestion)
      ? "included"
      : suggestion.uncertaintyReason === AI_UNCERTAINTY_REASONS.MODEL_NOT_EVALUATED
      ? "modelNotEvaluated"
      : "uncertain";
  }
  if (
    status === SCREENING_STATUS.REVIEW_NEEDED ||
    status === SCREENING_STATUS.REVIEWED ||
    status === SCREENING_STATUS.NO_EXCLUSION_SUGGESTED
  ) {
    evidence = getResultSources(suggestion, valueEvidence);
  }

  return {
    status,
    message,
    prediction: {
      category,
      nameOnly,
      // Detected value pattern (confirmed or review-level).
      valueConcept: valueEvidence?.detected ? valueEvidence.concept : null,
      valueReview,
      uncertain: predictionStatus === AI_SUGGESTION_STATUS.UNCERTAIN,
    },
    evidence,
    review,
    notScreenedReason,
  };
}

/**
 * Review summary of a table's screened rows (`row.screening` from
 * getColumnScreening): the number of rows that still require a researcher
 * decision, and of unscreened rows with the most common reason.
 */
export function getTableReviewSummary(rows = []) {
  let required = 0;
  let notScreened = 0;
  const reasons = new Map();
  rows.forEach((row) => {
    const { screening } = row;
    if (screening.review === REVIEW_STATE.REQUIRED) {
      required += 1;
    } else if (screening.status === SCREENING_STATUS.NOT_SCREENED) {
      notScreened += 1;
      reasons.set(
        screening.notScreenedReason,
        (reasons.get(screening.notScreenedReason) || 0) + 1
      );
    }
  });
  const notScreenedReason =
    Array.from(reasons.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
  return { required, notScreened, notScreenedReason };
}

const getColumnIdentity = (column = {}) => column.sourceField || column.field;

/**
 * Screening of every column of one Add Dataset table (as shown in its
 * preview). Only suggestions computed for the column's current name are
 * used.
 *
 * @returns {Array<{ column: Object, columnKey: string, screening: Object }>}
 */
export function getTableScreenings({ table, aiState, aiEnabled }) {
  const isAiRunning =
    aiState.status === AI_TABLE_STATUS.LOADING_MODEL ||
    aiState.status === AI_TABLE_STATUS.CLASSIFYING;
  return (table.columnMeta || []).map((column) => {
    const columnKey = getColumnIdentity(column);
    const stored = aiState.suggestions[columnKey];
    const suggestion = isSuggestionCurrent(stored, { columnName: column.field })
      ? stored
      : null;
    return {
      column,
      columnKey,
      screening: getColumnScreening({
        column,
        suggestion,
        aiState,
        aiEnabled,
        isAiRunning,
        isManualTable: Boolean(table.isManual),
      }),
    };
  });
}

/**
 * What still prevents submission: tables whose screening is running, and
 * included attributes with a potential direct-identifier finding that the
 * researcher has not resolved (excluded or confirmed).
 *
 * @returns {{ screeningTables: string[], unresolved: Array<{ tableName: string,
 *   attributeName: string }> }}
 */
export function getUnresolvedScreening(tables = [], aiStateByTable = {}, aiEnabled = true) {
  const screeningTables = [];
  const unresolved = [];
  tables.forEach((table) => {
    if (!Array.isArray(table.columnMeta)) return;
    const aiState = aiStateByTable[table._localTableId];
    if (!aiState) return;
    getTableScreenings({ table, aiState, aiEnabled }).forEach(({ column, screening }) => {
      if (screening.status === SCREENING_STATUS.PENDING) {
        if (!screeningTables.includes(table.name)) screeningTables.push(table.name);
      } else if (screening.review === REVIEW_STATE.REQUIRED) {
        unresolved.push({ tableName: table.name, attributeName: column.field });
      }
    });
  });
  return { screeningTables, unresolved };
}
