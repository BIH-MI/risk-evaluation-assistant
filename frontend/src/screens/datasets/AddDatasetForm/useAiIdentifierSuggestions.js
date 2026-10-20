import { useCallback, useEffect, useRef, useState } from "react";

import {
  AI_ERROR_CODES,
  AI_REVIEW_DECISIONS,
  AI_REVIEW_SUGGESTIONS,
  AI_SUGGESTION_STATUS,
  isSuggestionCurrent,
  markSuggestionReviewed,
  resolveColumnClassifierModel,
  suggestsExclusionReview,
} from "qidDiscovery/aiSuggestions";
import {
  createColumnClassifierSession,
  isCancelledClassification,
  preloadColumnClassifier,
} from "qidDiscovery/aiSuggestions/columnClassifierClient";
import { AI_TABLE_STATUS, EMPTY_TABLE_STATE } from "./aiSuggestions/aiSuggestionTableState";
import { addQidStage, recordQidStage } from "./qidPipelineTimings";

/*
 * Frontend-local state for optional AI identifier suggestions in Add Dataset.
 *
 * Suggestions live here, keyed by table and stable column identity, and never
 * in `columnMeta`: profiling refreshes replace `columnMeta` asynchronously, and
 * suggestions must not be persisted or treated as identifier evidence.
 *
 * Uploaded CSV tables are classified automatically as soon as their header
 * names are parsed (the model is preloaded when the upload starts), and again
 * for any column whose name or description changes. Only column names and
 * researcher-written descriptions reach the AI worker.
 *
 * All classifications use the model selected for the form (`modelId`, a
 * registry id). The form locks the selection once tables exist, and results
 * of any other model are discarded, so one dataset never mixes models.
 * `modelId` null means no model is available: columns are reported as
 * "AI unavailable" and left to manual review. With `enabled` false (AI
 * screening disabled by the QID discovery configuration) no model is loaded
 * and no unavailability is reported; column-name rules still apply.
 *
 * Before a table's initial subset profiling, its confident identifier
 * suggestions are collected with getInitialAiScreening() and applied in one
 * batch together with the initial profiling run (useInitialQidProfiling).
 * Afterwards, confident identifier suggestions (status "suggested" +
 * SUGGEST_EXCLUSION_REVIEW) are reported through `onAiExclusionDecisions`,
 * which applies them as `aiAutoExcluded` exclusions unless the researcher has
 * decided manually.
 */

const getColumnIdentity = (column = {}) => column.sourceField || column.field;

const columnVersionKey = (tableId, columnKey) => `${tableId}\u0000${columnKey}`;

// Only confident ("suggested") classifications drive automatic exclusion;
// uncertain and unavailable results never change exclusions.
function toAiExclusionDecision(suggestion) {
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

function getColumnAiDecision(column, state) {
  if (column.manualExclusionDecision === true) return null;
  const columnKey = getColumnIdentity(column);
  const suggestion = state.suggestions[columnKey];
  if (
    !isSuggestionCurrent(suggestion, {
      columnName: column.field,
      description: state.descriptions[columnKey],
    })
  ) {
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
 * Pure summary of a prepared table's AI screening, used before its initial
 * subset profiling. `settled` is true once every column without a manual
 * decision has a current result (suggested, uncertain, reviewed or
 * unavailable). `decisions` are the exclusions to apply in one batch, and
 * `pendingColumns` the columns still without a current result.
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
        description: state.descriptions[columnKey],
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

function isUploadedTableReady(table) {
  return (
    Boolean(table) &&
    !table.isParsing &&
    !table.isManual &&
    Boolean(table._qidProfilingSession) &&
    Array.isArray(table.columnMeta)
  );
}

function omitKey(object, key) {
  if (!object || !(key in object)) return object;
  const { [key]: _removed, ...rest } = object;
  return rest;
}

export function useAiIdentifierSuggestions({
  tables,
  onAiExclusionDecisions,
  modelId,
  enabled = true,
}) {
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
  // `${tableId}\0${columnKey}` -> { columnName, description, controller }.
  const inFlightRef = useRef(new Map());
  const onAiExclusionDecisionsRef = useRef(onAiExclusionDecisions);
  // tableId -> Map<columnKey, columnName>: results that arrived after the
  // initial-profiling fallback fired. They are shown, but not applied
  // automatically, so they cannot trigger another profiling run on their own.
  const suppressedRef = useRef(new Map());

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

  useEffect(() => {
    onAiExclusionDecisionsRef.current = onAiExclusionDecisions;
  }, [onAiExclusionDecisions]);

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

      const descriptions =
        aiStateRef.current[tableId]?.descriptions || EMPTY_TABLE_STATE.descriptions;
      const columns = sourceColumns
        .map((column) => ({
          columnKey: getColumnIdentity(column),
          columnName: column.field,
          description: descriptions[getColumnIdentity(column)] || "",
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
          description: column.description,
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
      let lastProgress = { phase: "loading-model", completed: 0, total: columns.length };

      if (runEnabled) {
        updateTableState(tableId, (previous) => ({
          ...previous,
          status:
            previous.status === AI_TABLE_STATUS.CLASSIFYING && hasOtherActiveRuns()
              ? previous.status
              : AI_TABLE_STATUS.LOADING_MODEL,
          // A new run starts from zero; no earlier completion is shown.
          progress: lastProgress,
          error: null,
        }));
      }

      // Merges results, skipping any column that was renamed, deleted or had
      // its description changed while the request was in flight, and never
      // replacing a researcher-reviewed suggestion for the same input.
      // Exclusions are applied by the reconciliation effect below.
      const mergeSuggestions = (incoming, nextStatus, error = null, finalProgress = null) => {
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
        const isPreparing = Boolean(currentTable) && !Array.isArray(currentTable.columnMeta);
        const currentState = aiStateRef.current[tableId] || EMPTY_TABLE_STATE;
        const accepted = incoming.filter((suggestion) => {
          const column =
            currentColumns.get(suggestion.columnKey) ||
            (isPreparing ? { field: suggestion.columnKey } : null);
          if (
            !column ||
            (suggestion.model?.registryId ?? null) !== modelIdRef.current ||
            getColumnVersion(tableId, suggestion.columnKey) !==
              versionsAtStart.get(suggestion.columnKey) ||
            !isSuggestionCurrent(suggestion, {
              columnName: column.field,
              description: currentState.descriptions[suggestion.columnKey],
            })
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
            suggestions[suggestion.columnKey] = suggestion;
          });

          return {
            ...previous,
            status:
              hasOtherActiveRuns() && nextStatus === AI_TABLE_STATUS.READY
                ? previous.status
                : nextStatus,
            progress:
              hasOtherActiveRuns() || !isLatestRun() ? previous.progress : finalProgress,
            error,
            suggestions,
          };
        });
      };

      try {
        if (!runEnabled) {
          // Column-name rules only; nothing is reported as unavailable.
          mergeSuggestions(
            getSession().buildUnavailableSuggestions(columns, null, { modelId: null }),
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
        recordQidStage(tableId, "aiClassificationMs", performance.now() - runStartedAt, {
          once: true,
        });
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
          if (inFlightRef.current.get(inFlightKeys[index])?.controller === controller) {
            inFlightRef.current.delete(inFlightKeys[index]);
          }
        });
      }
    },
    [getSession, updateTableState]
  );

  // Automatic classification: after initial profiling of an uploaded CSV,
  // and whenever a column lacks a suggestion for its current name and
  // description (renames, description edits, added columns). Columns already
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
            inFlight.description === (state.descriptions[columnKey] || "") &&
            !inFlight.controller.signal.aborted
          ) {
            return false;
          }
          return !isSuggestionCurrent(state.suggestions[columnKey], {
            columnName: column.field,
            description: state.descriptions[columnKey],
          });
        })
        .map(getColumnIdentity);

      if (columnKeys.length) {
        runForTable(tableId, { columnKeys });
      }
    });
  }, [aiStateByTable, runForTable, tables]);

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
          if (
            suppressed?.get(getColumnIdentity(column)) === column.field
          ) {
            return null;
          }
          return getColumnAiDecision(column, state);
        })
        .filter(Boolean);

      if (decisions.length) {
        onAiExclusionDecisionsRef.current?.(tableId, decisions);
      }
    });
  }, [aiStateByTable, tables]);

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
    if (modelIdRef.current === null) return;
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

  /**
   * Invalidates a renamed column's suggestion; the auto-classification effect
   * then classifies the new name. Manually added columns have no
   * sourceField, so their identity follows the name; the description moves to
   * the new identity in that case.
   */
  const handleColumnRenamed = useCallback(
    (tableId, previousKey, nextKey) => {
      bumpColumnVersion(tableId, previousKey);
      bumpColumnVersion(tableId, nextKey);
      updateTableState(tableId, (previous) => {
        const description = previous.descriptions[previousKey];
        const descriptions =
          previousKey === nextKey || description === undefined
            ? previous.descriptions
            : {
                ...omitKey(previous.descriptions, previousKey),
                [nextKey]: description,
              };
        const suggestions = omitKey(
          omitKey(previous.suggestions, previousKey),
          nextKey
        );
        return suggestions === previous.suggestions &&
          descriptions === previous.descriptions
          ? previous
          : { ...previous, suggestions, descriptions };
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
        descriptions: omitKey(previous.descriptions, columnKey),
      }));
    },
    [bumpColumnVersion, updateTableState]
  );

  const handleTableRemoved = useCallback(
    (tableId) => {
      abortTableRuns(tableId);
      controllersRef.current.delete(tableId);
      latestRunRef.current.delete(tableId);
      suppressedRef.current.delete(tableId);
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

  const setColumnDescription = useCallback(
    (tableId, columnKey, description) => {
      const normalized = String(description || "").trim();
      if ((aiStateRef.current[tableId]?.descriptions[columnKey] || "") === normalized) {
        return;
      }
      bumpColumnVersion(tableId, columnKey);
      updateTableState(tableId, (previous) => ({
        ...previous,
        descriptions: normalized
          ? { ...previous.descriptions, [columnKey]: normalized }
          : omitKey(previous.descriptions, columnKey),
        suggestions: omitKey(previous.suggestions, columnKey),
      }));
    },
    [bumpColumnVersion, updateTableState]
  );

  const reviewSuggestion = useCallback(
    (tableId, columnKey, decision, previousExcluded) => {
      updateTableState(tableId, (previous) => {
        const suggestion = previous.suggestions[columnKey];
        if (!suggestion || suggestion.status === AI_SUGGESTION_STATUS.UNAVAILABLE) {
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

  return {
    aiStateByTable,
    classifyFields,
    preloadModel,
    suppressLateAutoExclusions,
    handleColumnRenamed,
    handleColumnDeleted,
    handleTableRemoved,
    setColumnDescription,
    reviewSuggestion,
    handleManualExclusionChange,
  };
}
