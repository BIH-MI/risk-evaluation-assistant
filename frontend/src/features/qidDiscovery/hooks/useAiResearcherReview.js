import { useCallback } from "react";
import {
  AI_REVIEW_DECISIONS,
  AI_SUGGESTION_STATUS,
  markSuggestionReviewed,
} from "../ai/columnSuggestions";

/** Records researcher reviews independently from classification requests. */
export function useAiResearcherReview(updateTableState) {
  const reviewSuggestion = useCallback(
    (tableId, columnKey, decision, previousExcluded) => {
      updateTableState(tableId, (previous) => {
        const suggestion = previous.suggestions[columnKey];
        if (
          !suggestion ||
          suggestion.status === AI_SUGGESTION_STATUS.UNAVAILABLE
        ) {
          return previous;
        }
        return {
          ...previous,
          suggestions: {
            ...previous.suggestions,
            [columnKey]: markSuggestionReviewed(
              suggestion,
              decision,
              previousExcluded
            ),
          },
        };
      });
    },
    [updateTableState]
  );

  /** A manual checkbox change counts as the researcher's review decision. */
  const handleManualExclusionChange = useCallback(
    (tableId, columnKey, previousExcluded) => {
      reviewSuggestion(
        tableId,
        columnKey,
        AI_REVIEW_DECISIONS.MANUAL,
        previousExcluded
      );
    },
    [reviewSuggestion]
  );

  return { reviewSuggestion, handleManualExclusionChange };
}
