import {
  PROFILING_OUTCOME,
  mergeProfileEvidence,
} from "../profiling/profilingOutcome";
import { useCallback, useEffect, useRef } from "react";

import { applySchemaDirectIdentifierEvidence } from "features/qidDiscovery/validation/directIdentifierPolicy";
import {
  subscribeProfilingWorkerFailure,
  disposeUploadedTableProfile,
  prepareUploadedTable,
  refreshUploadedTableProfile,
} from "features/qidDiscovery/profiling/workerClient";
import {
  discardQidPipelineTiming,
  markQidStage,
  recordQidStage,
  reportQidPipelineTiming,
} from "../diagnostics/qidPipelineTimings";

function applyUnprofiledColumnDefaults(columnMeta = []) {
  return columnMeta.map((column) =>
    applySchemaDirectIdentifierEvidence(column)
  );
}

/**
 * Owns the Add Dataset profiling session lifecycle. Uploaded CSVs are parsed
 * and encoded once (prepareUploadedCsv). Their attribute subsets are profiled once
 * the initial exclusions are resolved (startInitialSubsetProfiling); schema edits made
 * before that only update column metadata. Later rename, exclusion,
 * and delete changes use cached encoded source columns so Distinguishability
 * evidence updates without another CSV scan.
 *
 * Table lifecycle: isParsing (parse + encode) -> _qidInitialProfilePending
 * (awaiting initial exclusions, isProfiling) -> isProfiling (subset
 * profiling) -> ready.
 */

/**
 * Lifecycle owner for local profiling sessions. Preparation returns metadata and
 * a worker session handle; refreshes reuse that session's encoded source values.
 *
 * Public operations:
 * - prepareUploadedCsv(file, tableId, configuration, { onFields }): stage 1.
 * - startInitialSubsetProfiling(tableId, columns): consume the initial-run guard.
 * - refreshSubsetProfile(tableId, columns): update metadata or start stage 2.
 * - disposeProfilingSession(tableId): release a removed table's source/cache.
 *
 * setTables must remain a React state setter: functional updates merge results
 * against the current schema instead of replacing a newer researcher decision.
 */
export function useProfilingSession({ tables, setTables, setErrors, t }) {
  // Assigned during render so callbacks and effects see committed tables.
  const mountedRef = useRef(true);
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const refreshRequestCounterRef = useRef(0);
  // Tables prepared but not yet profiled. Kept in a ref so the switch to
  // initial profiling is synchronous: no refresh can start in between.
  const pendingInitialProfileRef = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tablesRef.current.forEach((table) => {
        disposeUploadedTableProfile(table._qidProfilingSession);
      });
    };
  }, []);

  const setProfilingError = useCallback(
    (error) => {
      setErrors((current) => ({
        ...current,
        tables:
          error?.message ||
          t("datasets.alerts.profilingFailed", "CSV profiling failed."),
      }));
    },
    [setErrors, t]
  );

  const getTable = useCallback(
    (tableId) =>
      mountedRef.current
        ? tablesRef.current.find((table) => table._localTableId === tableId)
        : undefined,
    []
  );

  useEffect(
    () =>
      subscribeProfilingWorkerFailure(({ generation, error }) => {
        if (!mountedRef.current) return;
        // A shared worker crash invalidates even idle tables; their old successful
        // results must not be treated as refreshable live sessions.
        tablesRef.current.forEach((table) => {
          if (
            table._qidProfilingSession?.type === "worker" &&
            table._qidProfilingSession.generation === generation
          ) {
            pendingInitialProfileRef.current.delete(table._localTableId);
          }
        });
        setTables((current) =>
          current.map((table) =>
            table._qidProfilingSession?.type === "worker" &&
            table._qidProfilingSession.generation === generation
              ? {
                  ...table,
                  profilingOutcome: PROFILING_OUTCOME.FAILED,
                  profilingError: error.message,
                  subsetProfilingSummary: null,
                  _qidInitialProfilePending: false,
                  _qidRefreshRequestId: null,
                  isProfiling: false,
                }
              : table
          )
        );
      }),
    [setTables]
  );

  const prepareUploadedCsv = useCallback(
    async (file, tableId, qidDiscoveryConfiguration, { onFields } = {}) => {
      try {
        const { profilingSession, timings, ...preparedTable } =
          await prepareUploadedTable(file, {
            qidDiscoveryConfiguration,
            onFields,
          });

        const currentTable = getTable(tableId);
        if (!currentTable?.isParsing) {
          // Removed while parsing: nothing will use this session.
          disposeUploadedTableProfile(profilingSession);
          return;
        }

        if (timings) {
          recordQidStage(tableId, "csvFieldsMs", timings.fieldsMs);
          recordQidStage(tableId, "csvParseMs", timings.parseMs);
          recordQidStage(tableId, "csvPrepareMs", timings.prepareMs);
        }
        markQidStage(tableId, "preparedAtMs");

        pendingInitialProfileRef.current.add(tableId);
        setTables((currentTables) =>
          currentTables.map((table) =>
            table._localTableId === tableId && table.isParsing
              ? {
                  ...preparedTable,
                  _localTableId: table._localTableId,
                  _qidProfilingSession: profilingSession,
                  _qidInitialProfilePending: true,
                  name: table.name || preparedTable.name,
                  isParsing: false,
                  profilingOutcome: PROFILING_OUTCOME.AWAITING_SCREENING,
                  profilingError: null,
                  // Blocks submission until initial subset profiling is done.
                  isProfiling: true,
                  isManual: false,
                }
              : table
          )
        );
      } catch (error) {
        discardQidPipelineTiming(tableId);
        if (!getTable(tableId)) return;

        setProfilingError(error);
        setTables((currentTables) =>
          currentTables.filter((table) => table._localTableId !== tableId)
        );
      }
    },
    [getTable, setProfilingError, setTables]
  );

  const startSubsetProfiling = useCallback(
    (tableId, profilingSession, nextColumnMeta, { initial = false } = {}) => {
      const requestId = refreshRequestCounterRef.current + 1;
      refreshRequestCounterRef.current = requestId;

      setTables((currentTables) =>
        currentTables.map((currentTable) =>
          currentTable._localTableId === tableId
            ? {
                ...currentTable,
                columnMeta: nextColumnMeta,
                subsetProfilingSummary: null,
                isProfiling: true,
                profilingOutcome: PROFILING_OUTCOME.RUNNING,
                profilingError: null,
                _qidInitialProfilePending: false,
                _qidRefreshRequestId: requestId,
              }
            : currentTable
        )
      );

      refreshUploadedTableProfile(profilingSession, nextColumnMeta)
        .then((profile) => {
          // A newer refresh (e.g. a researcher edit) supersedes this result.
          const isCurrent =
            getTable(tableId)?._qidRefreshRequestId === requestId;
          if (initial && !isCurrent) discardQidPipelineTiming(tableId);
          if (initial && isCurrent) {
            recordQidStage(
              tableId,
              "subsetProfilingMs",
              profile.timings?.subsetProfilingMs
            );
            recordQidStage(
              tableId,
              "evaluatedSubsets",
              profile.subsetProfilingSummary?.evaluatedSubsetCount
            );
            reportQidPipelineTiming(tableId, {
              tableName: getTable(tableId)?.name,
              columnMeta: profile.columnMeta,
              summary: profile.subsetProfilingSummary,
              configuration:
                profilingSession.qidDiscoveryConfiguration?.profiling,
            });
          }
          setTables((currentTables) =>
            currentTables.map((currentTable) =>
              currentTable._localTableId === tableId &&
              currentTable._qidRefreshRequestId === requestId
                ? {
                    ...currentTable,
                    columnMeta: mergeProfileEvidence(
                      currentTable.columnMeta,
                      profile.columnMeta
                    ),
                    subsetProfilingSummary: profile.subsetProfilingSummary,
                    profilingOutcome: PROFILING_OUTCOME.SUCCEEDED,
                    profilingError: null,
                    isProfiling: false,
                  }
                : currentTable
            )
          );
        })
        .catch((error) => {
          if (initial) discardQidPipelineTiming(tableId);
          const currentTable = getTable(tableId);
          if (currentTable?._qidRefreshRequestId !== requestId) return;

          setProfilingError(error);
          setTables((currentTables) =>
            currentTables.map((currentTable) =>
              currentTable._localTableId === tableId &&
              currentTable._qidRefreshRequestId === requestId
                ? {
                    ...currentTable,
                    subsetProfilingSummary: null,
                    profilingOutcome: PROFILING_OUTCOME.FAILED,
                    profilingError: error.message,
                    isProfiling: false,
                  }
                : currentTable
            )
          );
        });
    },
    [getTable, setProfilingError, setTables]
  );

  /**
   * Runs a prepared table's first subset profiling with its resolved initial
   * exclusions. Returns false if the table is not awaiting it (already
   * started, removed, or not an uploaded table).
   */
  const startInitialSubsetProfiling = useCallback(
    (tableId, nextColumnMeta) => {
      if (!pendingInitialProfileRef.current.has(tableId)) return false;
      const table = getTable(tableId);
      if (!table?._qidProfilingSession) return false;

      pendingInitialProfileRef.current.delete(tableId);
      startSubsetProfiling(
        tableId,
        table._qidProfilingSession,
        nextColumnMeta,
        {
          initial: true,
        }
      );
      return true;
    },
    [getTable, startSubsetProfiling]
  );

  const refreshSubsetProfile = useCallback(
    (tableId, nextColumnMeta) => {
      const table = getTable(tableId);
      if (!table) return;

      if (!table._qidProfilingSession) {
        setTables((currentTables) =>
          currentTables.map((currentTable) =>
            currentTable._localTableId === tableId
              ? {
                  ...currentTable,
                  columnMeta: applyUnprofiledColumnDefaults(nextColumnMeta),
                  subsetProfilingSummary: null,
                }
              : currentTable
          )
        );
        return;
      }

      // Before initial profiling, edits only update metadata; the single
      // initial run then profiles the latest schema.
      if (pendingInitialProfileRef.current.has(tableId)) {
        setTables((currentTables) =>
          currentTables.map((currentTable) =>
            currentTable._localTableId === tableId
              ? { ...currentTable, columnMeta: nextColumnMeta }
              : currentTable
          )
        );
        return;
      }

      startSubsetProfiling(tableId, table._qidProfilingSession, nextColumnMeta);
    },
    [getTable, setTables, startSubsetProfiling]
  );

  const disposeProfilingSession = useCallback(
    (tableId) => {
      const table = getTable(tableId);
      pendingInitialProfileRef.current.delete(tableId);
      discardQidPipelineTiming(tableId);
      disposeUploadedTableProfile(table?._qidProfilingSession);
    },
    [getTable]
  );

  return {
    prepareUploadedCsv,
    startInitialSubsetProfiling,
    refreshSubsetProfile,
    disposeProfilingSession,
  };
}
