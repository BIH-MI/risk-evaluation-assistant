import {
  AI_SUGGESTION_STATUS,
  isSuggestionCurrent,
  suggestsExclusionReview,
} from "./columnSuggestions";
import { AI_REVIEW_SUGGESTIONS } from "./semanticCategories";
import { getColumnIdentity } from "../utils/columnIdentity";

/**
 * Converts the combined name-screening decision, not the raw model score.
 * A SUGGESTED result may be supported by a strong name rule even when modelStatus
 * is unavailable/uncertain. Model-only exclusion additionally requires approval
 * in columnSuggestions.js. Reviewed results are never automatic decisions.
 */
export function toAiExclusionDecision(suggestion) {
  if (suggestion.status !== AI_SUGGESTION_STATUS.SUGGESTED) return null;
  if (suggestsExclusionReview(suggestion)) {
    return {
      columnKey: suggestion.columnKey,
      columnName: suggestion.columnName,
      action: "exclude",
    };
  }
  if (
    suggestion.reviewSuggestion === AI_REVIEW_SUGGESTIONS.NO_EXCLUSION_SUGGESTED
  ) {
    return {
      columnKey: suggestion.columnKey,
      columnName: suggestion.columnName,
      action: "release",
    };
  }
  return null;
}

/** Returns only a current decision that would change metadata and has no manual override. */
export function getColumnAiDecision(column, state) {
  if (column.manualExclusionDecision === true) return null;
  const columnKey = getColumnIdentity(column);
  const suggestion = state.suggestions[columnKey];
  if (!isSuggestionCurrent(suggestion, { columnName: column.field })) {
    return null;
  }
  const decision = toAiExclusionDecision(suggestion);
  if (decision?.action === "exclude" && column.excluded !== true) {
    return decision;
  }
  if (
    decision?.action === "release" &&
    column.aiAutoExcluded === true &&
    column.excluded === true
  ) {
    return decision;
  }
  return null;
}

/**
 * Applies AI exclusion decisions to column metadata in one pass. AI
 * exclusions are tracked with their own `aiAutoExcluded` flag, separate from
 * value-pattern (`autoExcludedDirectIdentifier`) and researcher decisions:
 * - "exclude": excludes an included column and marks it aiAutoExcluded.
 * - "release": re-includes a column only if AI itself excluded it (e.g. a
 *   rename whose new name is confidently not an identifier).
 * Columns with an explicit researcher decision are never touched, and
 * decisions computed for a previous column name are ignored. Returns the
 * input array unchanged when no column changes.
 */
export function applyAiExclusionDecisionsToColumns(
  columnMeta = [],
  decisions = []
) {
  if (!decisions.length) return columnMeta;

  const decisionByKey = new Map(
    decisions.map((decision) => [decision.columnKey, decision])
  );
  let changed = false;
  const nextColumnMeta = columnMeta.map((column) => {
    const decision = decisionByKey.get(getColumnIdentity(column));
    if (
      !decision ||
      column.manualExclusionDecision === true ||
      decision.columnName !== column.field
    ) {
      return column;
    }

    if (decision.action === "exclude" && column.excluded !== true) {
      changed = true;
      return { ...column, excluded: true, aiAutoExcluded: true };
    }
    if (
      decision.action === "release" &&
      column.aiAutoExcluded === true &&
      column.excluded === true
    ) {
      changed = true;
      return { ...column, excluded: false, aiAutoExcluded: false };
    }
    return column;
  });

  return changed ? nextColumnMeta : columnMeta;
}
