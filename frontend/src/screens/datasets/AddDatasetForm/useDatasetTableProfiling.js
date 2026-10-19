import { useCallback, useEffect, useRef } from "react";

import { applySchemaDirectIdentifierEvidence } from "qidDiscovery";
import {
  disposeUploadedTableProfile,
  prepareUploadedTable,
  refreshUploadedTableProfile,
} from "qidDiscovery/workerClient";
import {
  discardQidPipelineTiming,
  markQidStage,
  recordQidStage,
  reportQidPipelineTiming,
} from "./qidPipelineTimings";

function applyUnprofiledColumnDefaults(columnMeta = []) {
  return columnMeta.map((column) =>
    applySchemaDirectIdentifierEvidence(column)
  );
}

/**
 * Owns the Add Dataset profiling session lifecycle. Uploaded CSVs are parsed
 * and encoded once (prepareTable). Their attribute subsets are profiled once
 * the initial exclusions are resolved (runInitialProfile); schema edits made
 * before that only update column metadata. Later rename, exclusion, datatype,
 * and delete changes use cached encoded source columns so Distinguishability
 * evidence updates without another CSV scan.
 *
 * Table lifecycle: isParsing (parse + encode) -> _qidInitialProfilePending
 * (awaiting initial exclusions, isProfiling) -> isProfiling (subset
 * profiling) -> ready.
 */
export function useDatasetTableProfiling({ tables, setTables, setErrors, t }) {
  // Assigned during render so callbacks and effects see committed tables.
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const refreshRequestCounterRef = useRef(0);
  // Tables prepared but not yet profiled. Kept in a ref so the switch to
  // initial profiling is synchronous: no refresh can start in between.
  const pendingInitialProfileRef = useRef(new Set());

  useEffect(() => {
    return () => {
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
      tablesRef.current.find((table) => table._localTableId === tableId),
    []
  );

  const prepareTable = useCallback(
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

  const startProfiling = useCallback(
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
                _qidInitialProfilePending: false,
                _qidRefreshRequestId: requestId,
              }
            : currentTable
        )
      );

      refreshUploadedTableProfile(profilingSession, nextColumnMeta)
        .then((profile) => {
          if (initial) {
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
            reportQidPipelineTiming(tableId);
          }
          setTables((currentTables) =>
            currentTables.map((currentTable) =>
              currentTable._localTableId === tableId &&
              currentTable._qidRefreshRequestId === requestId
                ? {
                    ...currentTable,
                    columnMeta: profile.columnMeta,
                    subsetProfilingSummary: profile.subsetProfilingSummary,
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
  const runInitialProfile = useCallback(
    (tableId, nextColumnMeta) => {
      if (!pendingInitialProfileRef.current.has(tableId)) return false;
      const table = getTable(tableId);
      if (!table?._qidProfilingSession) return false;

      pendingInitialProfileRef.current.delete(tableId);
      startProfiling(tableId, table._qidProfilingSession, nextColumnMeta, {
        initial: true,
      });
      return true;
    },
    [getTable, startProfiling]
  );

  const refreshTable = useCallback(
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

      startProfiling(tableId, table._qidProfilingSession, nextColumnMeta);
    },
    [getTable, setTables, startProfiling]
  );

  const disposeTableProfile = useCallback(
    (tableId) => {
      const table = getTable(tableId);
      pendingInitialProfileRef.current.delete(tableId);
      discardQidPipelineTiming(tableId);
      disposeUploadedTableProfile(table?._qidProfilingSession);
    },
    [getTable]
  );

  return {
    prepareTable,
    runInitialProfile,
    refreshTable,
    disposeTableProfile,
  };
}
