import { useCallback } from "react";
import { getColumnIdentity } from "features/qidDiscovery/utils/columnIdentity";

/** Keeps explicit schema decisions and the displayed suggestion review in sync. */
export function useDatasetScreeningReview({
  tables,
  handleManualExclusionChange,
  changeAttributeExclusion,
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

  return { handleExcludedChange };
}
