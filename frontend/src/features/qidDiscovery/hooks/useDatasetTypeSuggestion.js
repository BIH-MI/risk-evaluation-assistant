import { useEffect, useMemo, useState } from "react";

import { classifyDatasetType } from "../ai/columnClassifierClient";
import { resolveColumnClassifierModel } from "../ai/modelConfig";

// Waits for the column names to settle (uploads, renames) before asking.
const SETTLE_MS = 600;

export const DATASET_TYPE_SUGGESTION_STATUS = Object.freeze({
  IDLE: "idle",
  CLASSIFYING: "classifying",
  READY: "ready",
  UNAVAILABLE: "unavailable",
});

const IDLE_STATE = Object.freeze({
  status: DATASET_TYPE_SUGGESTION_STATUS.IDLE,
  suggestion: null,
});

/**
 * Asks the column classifier model for the dataset's type from the column
 * names of all prepared tables (datasetTypes.js), again whenever the names
 * change. Nothing is asked while AI screening is disabled, no model is
 * usable or a table is still being parsed.
 *
 * @param {Object} options
 * @param {Object[]} options.tables Local Add Dataset tables.
 * @param {string|null} options.modelId Selected registry id.
 * @param {boolean} options.enabled AI screening is enabled.
 * @returns {{ status: string, suggestion: { type: string, score: number } | null }}
 */
export function useDatasetTypeSuggestion({ tables, modelId, enabled }) {
  const [state, setState] = useState(IDLE_STATE);
  const resolvedModelId =
    modelId === null ? null : resolveColumnClassifierModel(modelId)?.id ?? null;
  const parsing = tables.some((table) => table.isParsing);
  // Stable key of the names, so unrelated table updates do not re-ask.
  const namesKey = useMemo(
    () =>
      JSON.stringify(
        tables.flatMap((table) =>
          (table.columnMeta || []).map((column) => column.field || "")
        )
      ),
    [tables]
  );

  useEffect(() => {
    const columnNames = JSON.parse(namesKey).filter(Boolean);
    if (!enabled || !resolvedModelId || parsing || !columnNames.length) {
      setState(IDLE_STATE);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((current) => ({
        ...current,
        status: DATASET_TYPE_SUGGESTION_STATUS.CLASSIFYING,
      }));
      classifyDatasetType(columnNames, {
        modelId: resolvedModelId,
        signal: controller.signal,
      })
        .then((suggestion) => {
          if (controller.signal.aborted) return;
          setState({
            status: DATASET_TYPE_SUGGESTION_STATUS.READY,
            suggestion,
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setState({
            status: DATASET_TYPE_SUGGESTION_STATUS.UNAVAILABLE,
            suggestion: null,
          });
        });
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, namesKey, parsing, resolvedModelId]);

  return state;
}
