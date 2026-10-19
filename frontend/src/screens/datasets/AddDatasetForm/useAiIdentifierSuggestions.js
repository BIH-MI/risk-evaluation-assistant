import { useCallback, useEffect, useRef, useState } from "react";

import {
  AI_ERROR_CODES,
  AI_REVIEW_DECISIONS,
  AI_REVIEW_SUGGESTIONS,
  AI_SUGGESTION_STATUS,
  isSuggestionCurrent,
  markSuggestionReviewed,
  suggestsExclusionReview,
} from "qidDiscovery/aiSuggestions";
import {
  createColumnClassifierSession,
  isCancelledClassification,
  preloadColumnClassifier,
} from "qidDiscovery/aiSuggestions/columnClassifierClient";
import { AI_TABLE_STATUS, EMPTY_TABLE_STATE } from "./aiSuggestions/aiSuggestionTableState";
import { recordQidStage } from "./qidPipelineTimings";

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

export function useAiIdentifierSuggestions({ tables, onAiExclusionDecisions }) {
  const [aiStateByTable, setAiStateByTable] = useState({});
  const tablesRef = useRef(tables);
  const aiStateRef = useRef(aiStateByTable);
  const sessionRef = useRef(null);
  // tableId -> Set<AbortController>: one per in-flight run, so a rename's
  // single-column run does not cancel the table's initial run.
  const controllersRef = useRef(new Map());
  const columnVersionsRef = useRef(new Map());
  // `${tableId}\0${columnKey}` -> { columnName, description, controller }.
  const inFlightRef = useRef(new Map());
  // tableId -> boolean. Enabled when an uploaded table is first ready;
  // disabled by Cancel / "Continue without AI"; re-enabled by an explicit run.
  const autoClassifyRef = useRef(new Map());
  const onAiExclusionDecisionsRef = useRef(onAiExclusionDecisions);
  // tableId -> Map<columnKey, columnName>: results that arrived after the
  // initial-profiling fallback fired. They are shown, but not applied
  // automatically, so they cannot trigger another profiling run on their own.
  const suppressedRef = useRef(new Map());

  // Assigned during render: header classification can start before this
  // hook's effects have run for a just-added table.
  tablesRef.current = tables;

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
    async (tableId, { columnKeys = null, auto = false, fields = null } = {}) => {
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
      if (!auto) {
        // An explicit run replaces any automatic or earlier run.
        autoClassifyRef.current.set(tableId, true);
        abortTableRuns(tableId);
      }

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
      const isCurrentRun = () =>
        !controller.signal.aborted &&
        tablesRef.current.some(
          (currentTable) => currentTable._localTableId === tableId
        );
      // Another run for this table is still active: keep its status/progress.
      const hasOtherActiveRuns = () => tableRuns.size > 1;

      updateTableState(tableId, (previous) => ({
        ...previous,
        status:
          previous.status === AI_TABLE_STATUS.CLASSIFYING && hasOtherActiveRuns()
            ? previous.status
            : AI_TABLE_STATUS.LOADING_MODEL,
        error: null,
      }));

      // Merges results, skipping any column that was renamed, deleted or had
      // its description changed while the request was in flight, and never
      // replacing a researcher-reviewed suggestion for the same input.
      // Exclusions are applied by the reconciliation effect below.
      const mergeSuggestions = (incoming, nextStatus, error = null) => {
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
            progress: hasOtherActiveRuns() ? previous.progress : null,
            error,
            suggestions,
          };
        });
      };

      try {
        const suggestions = await getSession().classifyColumns(columns, {
          signal: controller.signal,
          onProgress: (progress) => {
            if (!isCurrentRun()) return;
            updateTableState(tableId, (previous) => ({
              ...previous,
              status:
                progress?.phase === "classifying"
                  ? AI_TABLE_STATUS.CLASSIFYING
                  : AI_TABLE_STATUS.LOADING_MODEL,
              progress,
            }));
          },
        });
        if (!isCurrentRun()) return;
        recordQidStage(tableId, "aiClassificationMs", performance.now() - runStartedAt, {
          once: true,
        });
        mergeSuggestions(suggestions, AI_TABLE_STATUS.READY);
      } catch (error) {
        if (isCancelledClassification(error) || controller.signal.aborted) {
          if (hasOtherActiveRuns()) return;
          updateTableState(tableId, (previous) => ({
            ...previous,
            status: Object.keys(previous.suggestions).length
              ? AI_TABLE_STATUS.READY
              : AI_TABLE_STATUS.IDLE,
            progress: null,
          }));
          return;
        }
        if (!isCurrentRun()) return;

        mergeSuggestions(
          getSession().buildUnavailableSuggestions(columns, error),
          AI_TABLE_STATUS.UNAVAILABLE,
          {
            code: error?.code || AI_ERROR_CODES.INFERENCE_FAILED,
            message: error?.message || "",
          }
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
    [abortTableRuns, getSession, updateTableState]
  );

  // Automatic classification: after initial profiling of an uploaded CSV,
  // and whenever a column lacks a suggestion for its current name and
  // description (renames, description edits, added columns). Columns already
  // being classified are skipped, and cached inputs never reach the worker.
  useEffect(() => {
    tables.forEach((table) => {
      const tableId = table._localTableId;
      if (!isUploadedTableReady(table)) return;
      if (!autoClassifyRef.current.has(tableId)) {
        autoClassifyRef.current.set(tableId, true);
      }
      if (!autoClassifyRef.current.get(tableId)) return;

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
        runForTable(tableId, { columnKeys, auto: true });
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
      autoClassifyRef.current.set(tableId, true);
      runForTable(tableId, { fields, auto: true });
    },
    [runForTable]
  );

  /** Starts loading the model, e.g. while an uploaded CSV is being parsed. */
  const preloadModel = useCallback((tableId) => {
    const startedAt = performance.now();
    preloadColumnClassifier().then(({ loaded }) => {
      if (loaded) {
        recordQidStage(tableId, "modelLoadMs", performance.now() - startedAt);
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

  const cancelForTable = useCallback(
    (tableId) => {
      autoClassifyRef.current.set(tableId, false);
      abortTableRuns(tableId);
    },
    [abortTableRuns]
  );

  const continueWithoutAi = useCallback(
    (tableId) => {
      autoClassifyRef.current.set(tableId, false);
      abortTableRuns(tableId);
      updateTableState(tableId, (previous) => ({
        ...previous,
        manualReviewConfirmed: true,
      }));
    },
    [abortTableRuns, updateTableState]
  );

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
      autoClassifyRef.current.delete(tableId);
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

  /** Reopens a reviewed suggestion so the researcher can decide again. */
  const reopenSuggestion = useCallback(
    (tableId, columnKey) => {
      updateTableState(tableId, (previous) => {
        const suggestion = previous.suggestions[columnKey];
        if (suggestion?.status !== AI_SUGGESTION_STATUS.REVIEWED) return previous;
        return {
          ...previous,
          suggestions: {
            ...previous.suggestions,
            [columnKey]: {
              ...suggestion,
              status: suggestion.review?.reviewedStatus || AI_SUGGESTION_STATUS.SUGGESTED,
            },
          },
        };
      });
    },
    [updateTableState]
  );

  return {
    aiStateByTable,
    runForTable,
    classifyFields,
    preloadModel,
    suppressLateAutoExclusions,
    cancelForTable,
    continueWithoutAi,
    handleColumnRenamed,
    handleColumnDeleted,
    handleTableRemoved,
    setColumnDescription,
    reviewSuggestion,
    handleManualExclusionChange,
    reopenSuggestion,
  };
}
