import {
  getColumnIdentity,
  isUploadedTableReady,
} from "../utils/columnIdentity";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  AI_ERROR_CODES,
  resolveColumnClassifierModel,
} from "features/qidDiscovery/ai/modelConfig";
import {
  AI_SUGGESTION_STATUS,
  isSuggestionCurrent,
} from "features/qidDiscovery/ai/columnSuggestions";
import {
  createColumnClassifierSession,
  isCancelledClassification,
  preloadColumnClassifier,
} from "features/qidDiscovery/ai/columnClassifierClient";
import {
  AI_TABLE_STATUS,
  EMPTY_TABLE_STATE,
} from "../ai/aiSuggestionTableState";
import { addQidStage, recordQidStage } from "../diagnostics/qidPipelineTimings";

const columnVersionKey = (tableId, columnKey) => `${tableId}\u0000${columnKey}`;

function omitKey(object, key) {
  if (!object || !(key in object)) return object;
  const { [key]: _removed, ...rest } = object;
  return rest;
}

/**
 * Owns one form's classification cache, suggestions and asynchronous requests.
 * Only header/display names are sent to the classifier; CSV values stay in the
 * profiling path. This hook produces suggestions without changing exclusions.
 *
 * Request ownership has three levels: abort controllers cancel runs, run IDs
 * select the progress owner, and column versions reject renamed/deleted inputs.
 * These cannot be replaced by one table-wide loading flag because a rename can
 * overlap the initial request for the other columns in that table.
 *
 * @param {Object} options
 * @param {Object[]} options.tables Current local tables, including parsing placeholders.
 * @param {string|null} options.modelId Selected registry ID; null means no usable model.
 * @param {boolean} [options.enabled=true] False runs name rules without model inference.
 * @returns {Object} Suggestions, preload/classification callbacks, schema invalidation
 * callbacks, and updateTableState for useAiResearcherReview's functional updates.
 */
export function useAiClassification({ tables, modelId, enabled = true }) {
  const [aiStateByTable, setAiStateByTable] = useState({});
  const tablesRef = useRef(tables);
  const aiStateRef = useRef(aiStateByTable);
  const sessionRef = useRef(null);
  // tableId -> Set<AbortController>: one per in-flight run, so a rename's
  // single-column run does not cancel the table's initial run.
  const controllersRef = useRef(new Map());
  // tableId -> id of the newest classification run (progress ownership).
  const latestRunRef = useRef(new Map());
  const columnVersionsRef = useRef(new Map());
  // `${tableId}\0${columnKey}` -> { columnName, controller }.
  const inFlightRef = useRef(new Map());
  // null (no usable model) also for an unsupported explicit id: the default
  // model is never substituted for the configured one.
  const resolvedModelId =
    modelId === null ? null : resolveColumnClassifierModel(modelId)?.id ?? null;
  const modelIdRef = useRef(resolvedModelId);
  const enabledRef = useRef(enabled);

  // Assigned during render: header classification can start before this
  // hook's effects have run for a just-added table.
  tablesRef.current = tables;
  modelIdRef.current = resolvedModelId;
  enabledRef.current = enabled;

  useEffect(() => {
    aiStateRef.current = aiStateByTable;
  }, [aiStateByTable]);

  // Unmount: cancel pending requests and drop this form's classification
  // cache so nothing carries over to another dataset.
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((runs) => runs.forEach((run) => run.abort()));
      controllers.clear();
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  const abortTableRuns = useCallback((tableId) => {
    controllersRef.current.get(tableId)?.forEach((run) => run.abort());
  }, []);

  const getSession = useCallback(() => {
    if (!sessionRef.current) {
      sessionRef.current = createColumnClassifierSession();
    }
    return sessionRef.current;
  }, []);

  const updateTableState = useCallback((tableId, update) => {
    setAiStateByTable((current) => {
      const previous = current[tableId] || EMPTY_TABLE_STATE;
      const next = typeof update === "function" ? update(previous) : update;
      return next === previous ? current : { ...current, [tableId]: next };
    });
  }, []);

  const bumpColumnVersion = useCallback((tableId, columnKey) => {
    const key = columnVersionKey(tableId, columnKey);
    columnVersionsRef.current.set(
      key,
      (columnVersionsRef.current.get(key) || 0) + 1
    );
  }, []);

  const getColumnVersion = (tableId, columnKey) =>
    columnVersionsRef.current.get(columnVersionKey(tableId, columnKey)) || 0;

  const runForTable = useCallback(
    async (tableId, { columnKeys = null, fields = null } = {}) => {
      const table = tablesRef.current.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;
      // `fields`: CSV header names parsed before the table is prepared. Their
      // identity (sourceField) and initial display name are the header name.
      const sourceColumns = fields
        ? fields.map((field) => ({ field, sourceField: field }))
        : table.columnMeta;
      if (!Array.isArray(sourceColumns)) return;

      const columns = sourceColumns
        .map((column) => ({
          columnKey: getColumnIdentity(column),
          columnName: column.field,
        }))
        .filter(
          (column) =>
            column.columnKey &&
            (!columnKeys || columnKeys.includes(column.columnKey))
        );
      if (!columns.length) return;

      const controller = new AbortController();
      if (!controllersRef.current.has(tableId)) {
        controllersRef.current.set(tableId, new Set());
      }
      const tableRuns = controllersRef.current.get(tableId);
      tableRuns.add(controller);
      const inFlightKeys = columns.map((column) =>
        columnVersionKey(tableId, column.columnKey)
      );
      columns.forEach((column, index) => {
        inFlightRef.current.set(inFlightKeys[index], {
          columnName: column.columnName,
          controller,
        });
      });
      const versionsAtStart = new Map(
        columns.map((column) => [
          column.columnKey,
          getColumnVersion(tableId, column.columnKey),
        ])
      );
      const runStartedAt = performance.now();
      const runModelId = modelIdRef.current;
      const runEnabled = enabledRef.current;
      // Only the newest run of a table reports progress; events of older,
      // cancelled or superseded runs are ignored.
      const runId = (latestRunRef.current.get(tableId) || 0) + 1;
      latestRunRef.current.set(tableId, runId);
      const isLatestRun = () => latestRunRef.current.get(tableId) === runId;
      const isCurrentRun = () =>
        !controller.signal.aborted &&
        tablesRef.current.some(
          (currentTable) => currentTable._localTableId === tableId
        );
      // Another run for this table is still active: keep its status.
      const hasOtherActiveRuns = () => tableRuns.size > 1;
      let lastProgress = {
        phase: "loading-model",
        completed: 0,
        total: columns.length,
      };

      if (runEnabled) {
        updateTableState(tableId, (previous) => ({
          ...previous,
          status:
            previous.status === AI_TABLE_STATUS.CLASSIFYING &&
            hasOtherActiveRuns()
              ? previous.status
              : AI_TABLE_STATUS.LOADING_MODEL,
          // A new run starts from zero; no earlier completion is shown.
          progress: lastProgress,
          error: null,
        }));
      }

      // Merges results, skipping any column that was renamed or deleted while
      // the request was in flight, and never
      // replacing a researcher-reviewed suggestion for the same input.
      // Exclusions are applied separately by the initial-profile and
      // exclusion-reconciliation hooks.
      const mergeSuggestions = (
        incoming,
        nextStatus,
        error = null,
        finalProgress = null
      ) => {
        const currentTable = tablesRef.current.find(
          (candidate) => candidate._localTableId === tableId
        );
        const currentColumns = new Map(
          (currentTable?.columnMeta || []).map((column) => [
            getColumnIdentity(column),
            column,
          ])
        );
        // Still being prepared: header-based results are keyed and named by
        // the header itself until column metadata exists.
        const isPreparing =
          Boolean(currentTable) && !Array.isArray(currentTable.columnMeta);
        const currentState = aiStateRef.current[tableId] || EMPTY_TABLE_STATE;
        // Results of another model (the selection changed or AI was
        // disabled) are discarded.
        const accepted = incoming.filter((suggestion) => {
          const column =
            currentColumns.get(suggestion.columnKey) ||
            (isPreparing ? { field: suggestion.columnKey } : null);
          if (
            !column ||
            (suggestion.model?.registryId ?? null) !== modelIdRef.current ||
            getColumnVersion(tableId, suggestion.columnKey) !==
              versionsAtStart.get(suggestion.columnKey) ||
            !isSuggestionCurrent(suggestion, { columnName: column.field })
          ) {
            return false;
          }
          const existing = currentState.suggestions[suggestion.columnKey];
          return !(
            existing?.status === AI_SUGGESTION_STATUS.REVIEWED &&
            existing.inputKey === suggestion.inputKey &&
            existing.columnName === suggestion.columnName
          );
        });

        updateTableState(tableId, (previous) => {
          const suggestions = { ...previous.suggestions };
          accepted.forEach((suggestion) => {
            const existing = suggestions[suggestion.columnKey];
            // A review may have been queued after the snapshot above but before
            // this functional update. Preserve it for the same classified input.
            if (
              existing?.status === AI_SUGGESTION_STATUS.REVIEWED &&
              existing.inputKey === suggestion.inputKey &&
              existing.columnName === suggestion.columnName
            )
              return;
            suggestions[suggestion.columnKey] = suggestion;
          });

          return {
            ...previous,
            status:
              hasOtherActiveRuns() && nextStatus === AI_TABLE_STATUS.READY
                ? previous.status
                : nextStatus,
            progress:
              hasOtherActiveRuns() || !isLatestRun()
                ? previous.progress
                : finalProgress,
            error,
            suggestions,
          };
        });
      };

      try {
        if (!runEnabled) {
          // Column-name rules only; nothing is reported as unavailable.
          mergeSuggestions(
            getSession().buildUnavailableSuggestions(columns, null, {
              modelId: null,
            }),
            AI_TABLE_STATUS.READY
          );
          return;
        }
        const suggestions = await getSession().classifyColumns(columns, {
          modelId: runModelId,
          signal: controller.signal,
          onCacheStats: ({ total, uncached }) => {
            addQidStage(tableId, "aiInputsClassified", uncached);
            addQidStage(tableId, "aiInputsFromCache", total - uncached);
          },
          onProgress: (progress) => {
            if (!isCurrentRun() || !isLatestRun()) return;
            lastProgress = {
              ...progress,
              completed: progress?.completed ?? lastProgress.completed,
              total: progress?.total ?? lastProgress.total,
            };
            updateTableState(tableId, (previous) => ({
              ...previous,
              status:
                progress?.phase === "classifying"
                  ? AI_TABLE_STATUS.CLASSIFYING
                  : AI_TABLE_STATUS.LOADING_MODEL,
              progress: lastProgress,
            }));
          },
        });
        if (!isCurrentRun()) return;
        recordQidStage(
          tableId,
          "aiClassificationMs",
          performance.now() - runStartedAt,
          {
            once: true,
          }
        );
        mergeSuggestions(suggestions, AI_TABLE_STATUS.READY, null, {
          phase: "completed",
          completed: suggestions.length,
          total: columns.length,
        });
      } catch (error) {
        if (isCancelledClassification(error) || controller.signal.aborted) {
          if (hasOtherActiveRuns()) return;
          // Cancelled: no completion is claimed.
          updateTableState(tableId, (previous) => ({
            ...previous,
            status: Object.keys(previous.suggestions).length
              ? AI_TABLE_STATUS.READY
              : AI_TABLE_STATUS.IDLE,
            progress: isLatestRun() ? null : previous.progress,
          }));
          return;
        }
        if (!isCurrentRun()) return;

        mergeSuggestions(
          getSession().buildUnavailableSuggestions(columns, error, {
            modelId: runModelId,
          }),
          AI_TABLE_STATUS.UNAVAILABLE,
          {
            code: error?.code || AI_ERROR_CODES.INFERENCE_FAILED,
            message: error?.message || "",
          },
          // Keeps the counts reached before the failure (never 100%).
          { ...lastProgress, phase: "failed" }
        );
      } finally {
        tableRuns.delete(controller);
        columns.forEach((column, index) => {
          if (
            inFlightRef.current.get(inFlightKeys[index])?.controller ===
            controller
          ) {
            inFlightRef.current.delete(inFlightKeys[index]);
          }
        });
      }
    },
    [getSession, updateTableState]
  );

  // Automatic classification: after CSV preparation of an uploaded table,
  // and whenever a column lacks a suggestion for its current name (renames,
  // added columns). Columns already
  // being classified are skipped, and cached inputs never reach the worker.
  useEffect(() => {
    tables.forEach((table) => {
      const tableId = table._localTableId;
      if (!isUploadedTableReady(table)) return;

      const state = aiStateByTable[tableId] || EMPTY_TABLE_STATE;
      const columnKeys = table.columnMeta
        .filter((column) => {
          const columnKey = getColumnIdentity(column);
          if (!columnKey) return false;
          const inFlight = inFlightRef.current.get(
            columnVersionKey(tableId, columnKey)
          );
          if (
            inFlight?.columnName === column.field &&
            !inFlight.controller.signal.aborted
          ) {
            return false;
          }
          return !isSuggestionCurrent(state.suggestions[columnKey], {
            columnName: column.field,
          });
        })
        .map(getColumnIdentity);

      if (columnKeys.length) {
        runForTable(tableId, { columnKeys });
      }
    });
  }, [aiStateByTable, runForTable, tables]);

  /** Classifies CSV header names while the rest of the file is prepared. */
  const classifyFields = useCallback(
    (tableId, fields = []) => {
      if (!fields.length) return;
      runForTable(tableId, { fields });
    },
    [runForTable]
  );

  /** Starts loading the model, e.g. while an uploaded CSV is being parsed. */
  const preloadModel = useCallback((tableId) => {
    if (!enabledRef.current || modelIdRef.current === null) return;
    const startedAt = performance.now();
    const model = resolveColumnClassifierModel(modelIdRef.current);
    if (!model) return;
    recordQidStage(tableId, "aiModel", model.displayName);
    preloadColumnClassifier(model.id).then(({ loaded, alreadyLoaded }) => {
      if (loaded) {
        recordQidStage(tableId, "modelLoadMs", performance.now() - startedAt);
        // "warm": the model was already loaded (or loading) in this tab.
        recordQidStage(tableId, "modelState", alreadyLoaded ? "warm" : "cold");
      }
    });
  }, []);

  /**
   * Invalidates a renamed column's suggestion; the auto-classification effect
   * then classifies the new name. Manually added columns have no
   * sourceField, so their identity follows the name.
   */
  const handleColumnRenamed = useCallback(
    (tableId, previousKey, nextKey) => {
      bumpColumnVersion(tableId, previousKey);
      bumpColumnVersion(tableId, nextKey);
      updateTableState(tableId, (previous) => {
        const suggestions = omitKey(
          omitKey(previous.suggestions, previousKey),
          nextKey
        );
        return suggestions === previous.suggestions
          ? previous
          : { ...previous, suggestions };
      });
    },
    [bumpColumnVersion, updateTableState]
  );

  const handleColumnDeleted = useCallback(
    (tableId, columnKey) => {
      bumpColumnVersion(tableId, columnKey);
      updateTableState(tableId, (previous) => ({
        ...previous,
        suggestions: omitKey(previous.suggestions, columnKey),
      }));
    },
    [bumpColumnVersion, updateTableState]
  );

  const handleTableRemoved = useCallback(
    (tableId) => {
      abortTableRuns(tableId);
      controllersRef.current.delete(tableId);
      latestRunRef.current.delete(tableId);
      const prefix = columnVersionKey(tableId, "");
      [columnVersionsRef.current, inFlightRef.current].forEach((map) => {
        Array.from(map.keys()).forEach((key) => {
          if (key.startsWith(prefix)) map.delete(key);
        });
      });
      setAiStateByTable((current) => omitKey(current, tableId));
    },
    [abortTableRuns]
  );

  // Preparation failures remove placeholders outside the schema editor.
  // Cancel their inference too, so rejected files do not occupy the AI queue.
  useEffect(() => {
    const presentIds = new Set(tables.map(table => table._localTableId));
    for (const tableId of controllersRef.current.keys()) {
      if (!presentIds.has(tableId)) handleTableRemoved(tableId);
    }
  }, [tables, handleTableRemoved]);

  return {
    aiStateByTable,
    classifyFields,
    preloadModel,
    handleColumnRenamed,
    handleColumnDeleted,
    handleTableRemoved,
    updateTableState,
  };
}
