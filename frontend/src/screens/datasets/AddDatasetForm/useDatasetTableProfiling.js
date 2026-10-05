import { useCallback, useEffect, useRef } from "react";

import { applySchemaDirectIdentifierEvidence } from "qidDiscovery";
import {
  disposeUploadedTableProfile,
  profileUploadedTable,
  refreshUploadedTableProfile,
} from "qidDiscovery/workerClient";

function applyUnprofiledColumnDefaults(columnMeta = []) {
  return columnMeta.map((column) =>
    applySchemaDirectIdentifierEvidence(column, column.field)
  );
}

/**
 * Owns the Add Dataset profiling session lifecycle. Uploaded CSVs are profiled
 * once; later rename, exclusion, datatype, and delete changes use cached
 * encoded source columns so Distinguishability evidence updates without
 * another CSV scan.
 */
export function useDatasetTableProfiling({ tables, setTables, setErrors, t }) {
  const tablesRef = useRef(tables);
  const refreshRequestCounterRef = useRef(0);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

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

  const profileTable = useCallback(
    async (file, tableId, qidDiscoveryConfiguration) => {
      try {
        const { profilingSession, ...profiledTable } =
          await profileUploadedTable(file, { qidDiscoveryConfiguration });

        setTables((currentTables) =>
          currentTables.map((table) =>
            table._localTableId === tableId && table.isParsing
              ? {
                  ...profiledTable,
                  _localTableId: table._localTableId,
                  _qidProfilingSession: profilingSession,
                  name: table.name || profiledTable.name,
                  isParsing: false,
                  isProfiling: false,
                  isManual: false,
                }
              : table
          )
        );
      } catch (error) {
        if (!getTable(tableId)) return;

        setProfilingError(error);
        setTables((currentTables) =>
          currentTables.filter((table) => table._localTableId !== tableId)
        );
      }
    },
    [getTable, setProfilingError, setTables]
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
                _qidRefreshRequestId: requestId,
              }
            : currentTable
        )
      );

      refreshUploadedTableProfile(table._qidProfilingSession, nextColumnMeta)
        .then((profile) => {
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

  const disposeTableProfile = useCallback(
    (tableId) => {
      const table = getTable(tableId);
      disposeUploadedTableProfile(table?._qidProfilingSession);
    },
    [getTable]
  );

  return {
    profileTable,
    refreshTable,
    disposeTableProfile,
  };
}
