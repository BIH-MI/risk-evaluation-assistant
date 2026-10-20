import { useCallback, useEffect, useRef } from "react";

import { AI_MODEL_STATUS } from "qidDiscovery/aiSuggestions";

import { getInitialAiScreening } from "./useAiIdentifierSuggestions";
import { applyAiExclusionDecisionsToColumns } from "./useDatasetSchemaEditor";
import { markQidStage, recordQidStage } from "./qidPipelineTimings";

const DEFAULT_AI_SCREENING_TIMEOUT_MS = 30000;

/**
 * Maximum time a prepared table waits for AI column screening before its
 * initial subset profiling runs with the exclusions known so far. Override
 * with REACT_APP_QID_AI_SCREENING_TIMEOUT_MS (milliseconds).
 */
export const AI_SCREENING_TIMEOUT_MS = (() => {
  const configured = Number(process.env.REACT_APP_QID_AI_SCREENING_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_AI_SCREENING_TIMEOUT_MS;
})();

/**
 * Starts each uploaded table's initial subset profiling exactly once, after
 * both preparation tasks are done:
 * - CSV preparation (parsing, encoding, statistics, value-pattern evidence),
 * - AI column-name screening (every column has a current result, including
 *   "uncertain" or "unavailable"), or AI_SCREENING_TIMEOUT_MS has passed.
 *
 * Confident AI identifier decisions are applied to the column metadata in one
 * batch and the profiling run uses that metadata, so combinations are only
 * computed for the initially eligible attributes. On timeout, the columns
 * still being classified are profiled as they are, and their late AI results
 * are shown without being applied automatically.
 */
export function useInitialQidProfiling({
  tables,
  aiStateByTable,
  runInitialProfile,
  suppressLateAutoExclusions,
}) {
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const aiStateRef = useRef(aiStateByTable);
  aiStateRef.current = aiStateByTable;
  // tableId -> timeout handle, for tables waiting on AI screening.
  const timersRef = useRef(new Map());

  const clearTimer = useCallback((tableId) => {
    const timer = timersRef.current.get(tableId);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersRef.current.delete(tableId);
    }
  }, []);

  const startInitialProfile = useCallback(
    (tableId, { fallback = false } = {}) => {
      const table = tablesRef.current.find(
        (candidate) => candidate._localTableId === tableId
      );
      if (!table?._qidInitialProfilePending) return;

      const startedAt = performance.now();
      const { decisions, pendingColumns } = getInitialAiScreening(
        table,
        aiStateRef.current[tableId]
      );
      const nextColumnMeta = applyAiExclusionDecisionsToColumns(
        table.columnMeta,
        decisions
      );

      if (!runInitialProfile(tableId, nextColumnMeta)) return;

      clearTimer(tableId);
      if (fallback) suppressLateAutoExclusions(tableId, pendingColumns);
      recordQidStage(tableId, "initialExclusionMs", performance.now() - startedAt);
      recordQidStage(tableId, "aiAutoExclusions", decisions.length);
      recordQidStage(tableId, "aiScreeningTimedOut", fallback);
      recordQidStage(
        tableId,
        "aiUnavailableColumns",
        Object.values(aiStateRef.current[tableId]?.suggestions || {}).filter(
          (suggestion) => suggestion.modelStatus === AI_MODEL_STATUS.UNAVAILABLE
        ).length
      );
      markQidStage(tableId, "initialProfilingStartedAtMs");
    },
    [clearTimer, runInitialProfile, suppressLateAutoExclusions]
  );

  useEffect(() => {
    const presentIds = new Set();

    tables.forEach((table) => {
      const tableId = table._localTableId;
      presentIds.add(tableId);
      if (!table._qidInitialProfilePending) {
        clearTimer(tableId);
        return;
      }

      const { settled } = getInitialAiScreening(table, aiStateByTable[tableId]);
      if (settled) {
        markQidStage(tableId, "aiSettledAtMs");
        startInitialProfile(tableId);
        return;
      }

      if (!timersRef.current.has(tableId)) {
        timersRef.current.set(
          tableId,
          setTimeout(() => {
            timersRef.current.delete(tableId);
            startInitialProfile(tableId, { fallback: true });
          }, AI_SCREENING_TIMEOUT_MS)
        );
      }
    });

    // Removed tables.
    Array.from(timersRef.current.keys()).forEach((tableId) => {
      if (!presentIds.has(tableId)) clearTimer(tableId);
    });
  }, [aiStateByTable, clearTimer, startInitialProfile, tables]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);
}
