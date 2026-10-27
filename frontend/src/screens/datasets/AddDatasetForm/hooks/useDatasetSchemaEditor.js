import { PROFILING_OUTCOME } from "features/qidDiscovery/profiling/profilingOutcome";
import { getColumnIdentity } from "features/qidDiscovery/utils/columnIdentity";
import { applyAiExclusionDecisionsToColumns } from "features/qidDiscovery/ai/aiExclusionPolicy";
import { useCallback, useRef } from "react";

import {
  buildDirectIdentifierOverrideWarning,
  isDefaultExcludedIdentifierColumn,
} from "features/qidDiscovery/validation/directIdentifierPolicy";

let nextLocalTableId = 0;

const createLocalTableId = () => {
  nextLocalTableId += 1;
  return `add-dataset-table-${nextLocalTableId}`;
};

const getUniqueName = (existingNames, baseName, getFallbackName) => {
  const usedNames = new Set(existingNames);
  let candidate = baseName;
  let counter = 0;

  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = getFallbackName(counter);
  }

  return candidate;
};

/**
 * Edits the screen's local schema; sourceField continues to identify uploaded
 * values even when the researcher changes field (the display/persisted name).
 *
 * Rename/delete callbacks invalidate name classification before a local profile
 * refresh. Explicit exclusions mark manualExclusionDecision so reconciliation
 * cannot undo them. A manual flag does not bypass the separate submission rule
 * requiring detected HIGH-confidence value-pattern identifiers to be excluded.
 */
export function useDatasetSchemaEditor({
  tables,
  setTables,
  setErrors,
  setWarnings,
  refreshSubsetProfile,
  disposeProfilingSession,
  onColumnRenamed,
  onColumnDeleted,
  onTableRemoved,
  t,
}) {
  // Assigned during render (not in an effect) so AI reconciliation effects,
  // which run before this hook's effects, always see the committed tables.
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const addUploadedTablePlaceholder = useCallback(
    (file) => {
      if (tables.some((table) => table.name === file.name)) {
        setErrors((current) => ({
          ...current,
          tables: t("datasets.alerts.duplicateCsv", { name: file.name }),
        }));
        return false;
      }

      const localTableId = createLocalTableId();

      setErrors((current) => ({ ...current, tables: "" }));
      setTables((currentTables) => [
        ...currentTables,
        {
          _localTableId: localTableId,
          name: file.name,
          isParsing: true,
          profilingOutcome: PROFILING_OUTCOME.PREPARING,
          isManual: false,
        },
      ]);

      return localTableId;
    },
    [setErrors, setTables, tables, t]
  );

  const addManualTable = useCallback(() => {
    setTables((currentTables) => {
      const newName = getUniqueName(
        currentTables.map((table) => table.name),
        t("datasets.add.newTable"),
        (counter) => t("datasets.add.newTableCounter", { counter })
      );

      return [
        ...currentTables,
        {
          _localTableId: createLocalTableId(),
          name: newName,
          columnMeta: [],
          data: [],
          subsetProfilingSummary: null,
          isParsing: false,
          isManual: true,
          profilingOutcome: PROFILING_OUTCOME.SCHEMA_ONLY,
        },
      ];
    });
  }, [setTables, t]);

  const addAttribute = useCallback(
    (tableId) => {
      setTables((currentTables) =>
        currentTables.map((table) => {
          if (table._localTableId !== tableId) return table;

          const fieldName = getUniqueName(
            (table.columnMeta || []).map((column) => column.field),
            t("datasets.add.newAttribute"),
            (counter) => t("datasets.add.newAttributeCounter", { counter })
          );

          return {
            ...table,
            columnMeta: [
              ...(table.columnMeta || []),
              {
                field: fieldName,
                sourceField: null,
                hasObservedData: false,
                level: "STRING",
                excluded: false,
                statistics: null,
              },
            ],
          };
        })
      );
    },
    [setTables, t]
  );

  const deleteAttribute = useCallback(
    (tableId, columnKey) => {
      const table = tables.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;

      onColumnDeleted?.(tableId, columnKey);
      refreshSubsetProfile(
        tableId,
        table.columnMeta.filter(
          (column) => getColumnIdentity(column) !== columnKey
        )
      );
    },
    [onColumnDeleted, refreshSubsetProfile, tables]
  );

  const removeTable = useCallback(
    (tableId) => {
      disposeProfilingSession(tableId);
      onTableRemoved?.(tableId);
      setTables((currentTables) =>
        currentTables.filter((table) => table._localTableId !== tableId)
      );
      setErrors((current) => ({ ...current, tableName: "" }));
    },
    [disposeProfilingSession, onTableRemoved, setErrors, setTables]
  );

  const renameTable = useCallback(
    (tableId, newName) => {
      const duplicateName = tables.some(
        (table) => table._localTableId !== tableId && table.name === newName
      );
      if (duplicateName) {
        setErrors((current) => ({
          ...current,
          tableName: t("datasets.alerts.duplicateTableName", {
            name: newName,
          }),
        }));
        return false;
      }

      setErrors((current) => ({ ...current, tableName: "" }));
      setTables((currentTables) =>
        currentTables.map((table) =>
          table._localTableId === tableId ? { ...table, name: newName } : table
        )
      );
      return true;
    },
    [setErrors, setTables, tables, t]
  );

  const renameAttribute = useCallback(
    (tableId, columnKey, newField) => {
      const table = tables.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;

      const renamedColumn = table.columnMeta.find(
        (column) => getColumnIdentity(column) === columnKey
      );
      if (!renamedColumn || renamedColumn.field === newField) return;
      // The name cell commits on every blur; only a real rename invalidates
      // name-based AI suggestions. sourceField stays the stable identity.
      if (renamedColumn && renamedColumn.field !== newField) {
        onColumnRenamed?.(
          tableId,
          columnKey,
          getColumnIdentity({ ...renamedColumn, field: newField })
        );
      }

      refreshSubsetProfile(
        tableId,
        table.columnMeta.map((column) =>
          getColumnIdentity(column) === columnKey
            ? {
                ...column,
                field: newField,
              }
            : column
        )
      );
    },
    [onColumnRenamed, refreshSubsetProfile, tables]
  );

  // The datatype is schema metadata. This edit does not cast CSV strings or
  // rebuild equivalence classes; observed values retain their uploaded encoding.
  const changeAttributeDataType = useCallback(
    (tableId, columnKey, newType) => {
      setTables((currentTables) =>
        currentTables.map((table) =>
          table._localTableId === tableId
            ? {
                ...table,
                columnMeta: table.columnMeta.map((column) =>
                  getColumnIdentity(column) === columnKey
                    ? { ...column, level: newType }
                    : column
                ),
              }
            : table
        )
      );
    },
    [setTables]
  );

  const changeAttributeExclusion = useCallback(
    (tableId, columnKey, excluded) => {
      const table = tables.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;

      const changedColumn = table.columnMeta.find(
        (column) => getColumnIdentity(column) === columnKey
      );
      const overrideWarning = buildDirectIdentifierOverrideWarning(
        t,
        changedColumn,
        excluded
      );

      if (overrideWarning) {
        setWarnings((current) => ({
          ...current,
          directIdentifier: overrideWarning,
        }));
      } else if (excluded) {
        setWarnings((current) => ({
          ...current,
          directIdentifier: "",
        }));
      }

      refreshSubsetProfile(
        tableId,
        table.columnMeta.map((column) =>
          getColumnIdentity(column) === columnKey
            ? {
                ...column,
                excluded,
                directIdentifierExclusionOverridden:
                  !excluded && isDefaultExcludedIdentifierColumn(column),
                // An explicit researcher decision always wins over AI-based
                // automatic exclusion, including after renames/refreshes.
                manualExclusionDecision: true,
                aiAutoExcluded: false,
              }
            : column
        )
      );
    },
    [refreshSubsetProfile, setWarnings, tables, t]
  );

  /**
   * Applies confident AI decisions to an already profiled table (see
   * applyAiExclusionDecisionsToColumns). Profiling is refreshed only when the
   * set of eligible attributes actually changes.
   */
  const applyAiExclusionDecisions = useCallback(
    (tableId, decisions = []) => {
      const table = tablesRef.current.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table || !Array.isArray(table.columnMeta) || !decisions.length) {
        return;
      }

      const nextColumnMeta = applyAiExclusionDecisionsToColumns(
        table.columnMeta,
        decisions
      );

      if (nextColumnMeta !== table.columnMeta) {
        // Results for several tables/columns can arrive before React
        // re-renders; keep the ref current so they build on each other.
        tablesRef.current = tablesRef.current.map((currentTable) =>
          currentTable._localTableId === tableId
            ? { ...currentTable, columnMeta: nextColumnMeta }
            : currentTable
        );
        refreshSubsetProfile(tableId, nextColumnMeta);
      }
    },
    [refreshSubsetProfile]
  );

  return {
    addUploadedTablePlaceholder,
    addManualTable,
    addAttribute,
    deleteAttribute,
    removeTable,
    renameTable,
    renameAttribute,
    changeAttributeDataType,
    changeAttributeExclusion,
    applyAiExclusionDecisions,
  };
}
