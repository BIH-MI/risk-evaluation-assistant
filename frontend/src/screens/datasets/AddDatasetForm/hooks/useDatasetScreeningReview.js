import { useCallback } from "react";
import { getColumnIdentity } from "features/qidDiscovery/utils/columnIdentity";
import {
  AI_REVIEW_DECISIONS,
  suggestsExclusionReview,
} from "features/qidDiscovery/ai/columnSuggestions";

/** Keeps explicit schema decisions and the displayed suggestion review in sync. */
export function useDatasetScreeningReview({
  tables,
  aiStateByTable,
  handleManualExclusionChange,
  changeAttributeExclusion,
  reviewSuggestion,
  confirmAttributeExclusion,
}) {
  const findColumn = useCallback(
    (tableId, columnKey) =>
      tables
        .find((table) => table._localTableId === tableId)
        ?.columnMeta?.find((column) => getColumnIdentity(column) === columnKey),
    [tables]
  );

  /**
   * Manual checkbox changes go through the existing exclusion workflow
   * (override warnings + refreshUploadedTableProfile) and also count as the
   * researcher's decision on any AI suggestion for that column.
   */
  const handleExcludedChange = useCallback(
    (tableId, columnKey, excluded) => {
      const column = findColumn(tableId, columnKey);
      handleManualExclusionChange(
        tableId,
        columnKey,
        Boolean(column?.excluded)
      );
      changeAttributeExclusion(tableId, columnKey, excluded);
    },
    [changeAttributeExclusion, findColumn, handleManualExclusionChange]
  );

  /**
   * Records the researcher's decision to keep the column's current exclusion
   * state ("Confirm exclusion" / "Keep included"). The exclusion does not
   * change, so profiling is not recomputed.
   */
  const handleConfirmScreening = useCallback(
    (tableId, columnKey) => {
      const column = findColumn(tableId, columnKey);
      if (!column) return;
      const excluded = Boolean(column.excluded);
      const suggestion = aiStateByTable[tableId]?.suggestions?.[columnKey];
      reviewSuggestion(
        tableId,
        columnKey,
        excluded
          ? AI_REVIEW_DECISIONS.ACCEPTED
          : suggestsExclusionReview(suggestion)
          ? AI_REVIEW_DECISIONS.REJECTED
          : AI_REVIEW_DECISIONS.ACKNOWLEDGED,
        excluded
      );
      confirmAttributeExclusion(tableId, columnKey);
    },
    [aiStateByTable, confirmAttributeExclusion, findColumn, reviewSuggestion]
  );

  return { handleExcludedChange, handleConfirmScreening };
}
