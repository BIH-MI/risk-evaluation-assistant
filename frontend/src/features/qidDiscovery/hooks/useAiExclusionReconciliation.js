import { useCallback, useEffect, useRef } from "react";
import {
  getColumnIdentity,
  isUploadedTableReady,
} from "../utils/columnIdentity";
import { getColumnAiDecision } from "../ai/aiExclusionPolicy";

/** Applies current AI decisions after initial profiling, preserving manual overrides. */
export function useAiExclusionReconciliation({
  tables,
  aiStateByTable,
  onAiExclusionDecisions,
}) {
  // Late results after the initial timeout stay visible but require review.
  const suppressedRef = useRef(new Map());
  // Reconciles column metadata with the current AI results after a table's
  // initial subset profiling. Applying AI exclusions here (rather than once,
  // when a result arrives) keeps them in place even if a later schema update
  // was built from an older columnMeta snapshot. Only columns whose metadata
  // differs from the AI decision are reported, so this settles after one
  // update. Columns with an explicit researcher decision are never touched.
  // Tables awaiting initial profiling are skipped: their AI exclusions are
  // applied in one batch together with that run.
  useEffect(() => {
    tables.forEach((table) => {
      const tableId = table._localTableId;
      const state = aiStateByTable[tableId];
      if (!state || !isUploadedTableReady(table)) return;
      if (table._qidInitialProfilePending) return;

      const suppressed = suppressedRef.current.get(tableId);
      const decisions = table.columnMeta
        .map((column) => {
          if (suppressed?.get(getColumnIdentity(column)) === column.field) {
            return null;
          }
          return getColumnAiDecision(column, state);
        })
        .filter(Boolean);

      if (decisions.length) {
        onAiExclusionDecisions?.(tableId, decisions);
      }
    });
  }, [aiStateByTable, onAiExclusionDecisions, tables]);

  /**
   * Called when initial profiling ran without waiting for these columns'
   * AI results (fallback). Their late results remain visible but are not
   * applied automatically; a later rename reclassifies normally.
   */
  const suppressLateAutoExclusions = useCallback((tableId, columns = []) => {
    if (!columns.length) return;
    const suppressed = suppressedRef.current.get(tableId) || new Map();
    columns.forEach(({ columnKey, columnName }) => {
      suppressed.set(columnKey, columnName);
    });
    suppressedRef.current.set(tableId, suppressed);
  }, []);

  useEffect(() => {
    const presentIds = new Set(tables.map((table) => table._localTableId));
    suppressedRef.current.forEach((_columns, tableId) => {
      if (!presentIds.has(tableId)) suppressedRef.current.delete(tableId);
    });
  }, [tables]);

  return { suppressLateAutoExclusions };
}
