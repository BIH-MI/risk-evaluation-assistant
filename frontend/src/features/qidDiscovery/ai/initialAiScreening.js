import { EMPTY_TABLE_STATE } from "./aiSuggestionTableState";
import { isSuggestionCurrent } from "./columnSuggestions";
import { getColumnAiDecision } from "./aiExclusionPolicy";
import { getColumnIdentity } from "../utils/columnIdentity";

/**
 * Pure summary of a prepared table's AI screening, used before its initial
 * subset profiling. Settled means computation is ready, not that every finding
 * has been reviewed or that submission is allowed. `settled` is true once every
 * column without a manual decision has a current result (suggested, uncertain, reviewed or
 * unavailable). `decisions` are the exclusions to apply in one batch, and
 * `pendingColumns` the columns still without a current result.
 *
 * @param {Object} table Prepared local table with columnMeta.
 * @param {Object} [state=EMPTY_TABLE_STATE] This table's local suggestion state.
 * @returns {{settled: boolean, decisions: Object[], pendingColumns: Object[]}}
 * Pending column identities are also used to suppress automatic late decisions.
 */
export function getInitialAiScreening(table, state = EMPTY_TABLE_STATE) {
  const pendingColumns = [];
  const decisions = [];

  (table?.columnMeta || []).forEach((column) => {
    const columnKey = getColumnIdentity(column);
    if (!columnKey) return;
    if (
      column.manualExclusionDecision !== true &&
      !isSuggestionCurrent(state.suggestions[columnKey], {
        columnName: column.field,
      })
    ) {
      pendingColumns.push({ columnKey, columnName: column.field });
      return;
    }
    const decision = getColumnAiDecision(column, state);
    if (decision) decisions.push(decision);
  });

  return { settled: pendingColumns.length === 0, decisions, pendingColumns };
}
