import { useCallback, useEffect, useRef } from "react";

import {
  disposeUploadedTableProfile,
  profileUploadedTable,
  refreshUploadedTableProfile,
} from "qidDiscovery";
import { applySchemaDirectIdentifierEvidence } from "qidDiscovery/directIdentifierPolicy";

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

const getColumnSourceField = (column = {}) =>
  column.sourceField || column.field;

const hasColumnSourceField = (columnMeta = [], sourceField) =>
  Boolean(sourceField) &&
  columnMeta.some((column) => getColumnSourceField(column) === sourceField);

function getNextSubjectKeySourceField(table, columnMeta, refreshOptions) {
  const hasSubjectKeyChange = hasOwn(refreshOptions, "subjectKeySourceField");
  const requestedSubjectKeySourceField = hasSubjectKeyChange
    ? refreshOptions.subjectKeySourceField || null
    : table.subjectKeySourceField || null;

  return hasColumnSourceField(columnMeta, requestedSubjectKeySourceField)
    ? requestedSubjectKeySourceField
    : null;
}

function buildEffectiveRefreshOptions(
  table,
  refreshOptions,
  nextSubjectKeySourceField
) {
  const hasSubjectKeyChange = hasOwn(refreshOptions, "subjectKeySourceField");
  const requestedSubjectKeySourceField = hasSubjectKeyChange
    ? refreshOptions.subjectKeySourceField || null
    : table.subjectKeySourceField || null;

  if (
    !hasSubjectKeyChange &&
    requestedSubjectKeySourceField === nextSubjectKeySourceField
  ) {
    return refreshOptions;
  }

  return {
    ...refreshOptions,
    subjectKeySourceField: nextSubjectKeySourceField,
  };
}

function applyUnprofiledColumnDefaults(columnMeta = []) {
  return columnMeta.map((column) =>
    applySchemaDirectIdentifierEvidence(column, column.field)
  );
}

/**
 * Owns the Add Dataset profiling session lifecycle. Uploaded CSVs are profiled
 * once; later rename, exclusion, datatype, delete, and subject-key changes use
 * cached encoded columns so QID discovery updates without another CSV scan.
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
                  qidDiscoveryConfiguration:
                    profiledTable.qidDiscoveryConfiguration ||
                    qidDiscoveryConfiguration,
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
    (tableId, nextColumnMeta, refreshOptions = {}) => {
      const table = getTable(tableId);
      if (!table) return;

      const nextSubjectKeySourceField = getNextSubjectKeySourceField(
        table,
        nextColumnMeta,
        refreshOptions
      );
      const effectiveRefreshOptions = buildEffectiveRefreshOptions(
        table,
        refreshOptions,
        nextSubjectKeySourceField
      );
      const pendingColumnMeta = nextColumnMeta;

      if (!table._qidProfilingSession) {
        setTables((currentTables) =>
          currentTables.map((currentTable) =>
            currentTable._localTableId === tableId
              ? {
                  ...currentTable,
                  columnMeta: applyUnprofiledColumnDefaults(nextColumnMeta),
                  qidCombinations: [],
                  qidSearchMode: "none",
                  subjectKeySourceField: nextSubjectKeySourceField,
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
                columnMeta: pendingColumnMeta,
                subjectKeySourceField: nextSubjectKeySourceField,
                isProfiling: true,
                _qidRefreshRequestId: requestId,
              }
            : currentTable
        )
      );

      refreshUploadedTableProfile(
        table._qidProfilingSession,
        pendingColumnMeta,
        effectiveRefreshOptions
      )
        .then((profile) => {
          setTables((currentTables) =>
            currentTables.map((currentTable) =>
              currentTable._localTableId === tableId &&
              currentTable._qidRefreshRequestId === requestId
                ? {
                    ...currentTable,
                    columnMeta: profile.columnMeta,
                    qidCombinations: profile.qidCombinations,
                    qidSearchMode: profile.qidSearchMode,
                    subjectKeySourceField: profile.subjectKeySourceField,
                    suggestedSubjectKeySourceFields:
                      profile.suggestedSubjectKeySourceFields,
                    repeatedMeasurementSummary:
                      profile.repeatedMeasurementSummary,
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
                    isProfiling: false,
                  }
                : currentTable
            )
          );
        });
    },
    [getTable, setProfilingError, setTables]
  );

  const changeSubjectKey = useCallback(
    (tableId, subjectKeySourceField) => {
      const table = getTable(tableId);
      if (!table) return;

      refreshTable(tableId, table.columnMeta || [], {
        subjectKeySourceField: subjectKeySourceField || null,
      });
    },
    [getTable, refreshTable]
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
    changeSubjectKey,
    disposeTableProfile,
  };
}
