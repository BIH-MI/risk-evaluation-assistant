import { useCallback, useRef } from "react";

import {
  buildDirectIdentifierOverrideWarning,
  isDefaultExcludedIdentifierColumn,
} from "qidDiscovery";

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

const getColumnIdentity = (column = {}) => column.sourceField || column.field;

/**
 * Applies AI exclusion decisions to column metadata in one pass. AI
 * exclusions are tracked with their own `aiAutoExcluded` flag, separate from
 * value-pattern (`autoExcludedDirectIdentifier`) and researcher decisions:
 * - "exclude": excludes an included column and marks it aiAutoExcluded.
 * - "release": re-includes a column only if AI itself excluded it (e.g. a
 *   rename whose new name is confidently not an identifier).
 * Columns with an explicit researcher decision are never touched, and
 * decisions computed for a previous column name are ignored. Returns the
 * input array unchanged when no column changes.
 */
export function applyAiExclusionDecisionsToColumns(columnMeta = [], decisions = []) {
  if (!decisions.length) return columnMeta;

  const decisionByKey = new Map(
    decisions.map((decision) => [decision.columnKey, decision])
  );
  let changed = false;
  const nextColumnMeta = columnMeta.map((column) => {
    const decision = decisionByKey.get(getColumnIdentity(column));
    if (
      !decision ||
      column.manualExclusionDecision === true ||
      decision.columnName !== column.field
    ) {
      return column;
    }

    if (decision.action === "exclude" && column.excluded !== true) {
      changed = true;
      return { ...column, excluded: true, aiAutoExcluded: true };
    }
    if (
      decision.action === "release" &&
      column.aiAutoExcluded === true &&
      column.excluded === true
    ) {
      changed = true;
      return { ...column, excluded: false, aiAutoExcluded: false };
    }
    return column;
  });

  return changed ? nextColumnMeta : columnMeta;
}

export function useDatasetSchemaEditor({
  tables,
  setTables,
  setErrors,
  setWarnings,
  refreshTable,
  disposeTableProfile,
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
      refreshTable(
        tableId,
        table.columnMeta.filter(
          (column) => getColumnIdentity(column) !== columnKey
        )
      );
    },
    [onColumnDeleted, refreshTable, tables]
  );

  const removeTable = useCallback(
    (tableId) => {
      disposeTableProfile(tableId);
      onTableRemoved?.(tableId);
      setTables((currentTables) =>
        currentTables.filter((table) => table._localTableId !== tableId)
      );
      setErrors((current) => ({ ...current, tableName: "" }));
    },
    [disposeTableProfile, onTableRemoved, setErrors, setTables]
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
      // The name cell commits on every blur; only a real rename invalidates
      // name-based AI suggestions. sourceField stays the stable identity.
      if (renamedColumn && renamedColumn.field !== newField) {
        onColumnRenamed?.(
          tableId,
          columnKey,
          getColumnIdentity({ ...renamedColumn, field: newField })
        );
      }

      refreshTable(
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
    [onColumnRenamed, refreshTable, tables]
  );

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

      refreshTable(
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
    [refreshTable, setWarnings, tables, t]
  );

  /**
   * Records an explicit researcher decision that keeps the column's current
   * exclusion state (review confirmation). Only metadata changes: the set of
   * profiled attributes is the same, so profiling is not recomputed. A
   * profiling run still in flight keeps the decision (see
   * useDatasetTableProfiling).
   */
  const confirmAttributeExclusion = useCallback(
    (tableId, columnKey) => {
      const confirm = (currentTable) =>
        currentTable._localTableId === tableId && Array.isArray(currentTable.columnMeta)
          ? {
              ...currentTable,
              columnMeta: currentTable.columnMeta.map((column) =>
                getColumnIdentity(column) === columnKey
                  ? { ...column, manualExclusionDecision: true }
                  : column
              ),
            }
          : currentTable;
      tablesRef.current = tablesRef.current.map(confirm);
      setTables((currentTables) => currentTables.map(confirm));
    },
    [setTables]
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
        refreshTable(tableId, nextColumnMeta);
      }
    },
    [refreshTable]
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
    confirmAttributeExclusion,
    applyAiExclusionDecisions,
  };
}
