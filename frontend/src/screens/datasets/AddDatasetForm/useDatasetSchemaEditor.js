import { useCallback } from "react";

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

export function useDatasetSchemaEditor({
  tables,
  setTables,
  setErrors,
  setWarnings,
  refreshTable,
  disposeTableProfile,
  t,
}) {
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

      refreshTable(
        tableId,
        table.columnMeta.filter(
          (column) => getColumnIdentity(column) !== columnKey
        )
      );
    },
    [refreshTable, tables]
  );

  const removeTable = useCallback(
    (tableId) => {
      disposeTableProfile(tableId);
      setTables((currentTables) =>
        currentTables.filter((table) => table._localTableId !== tableId)
      );
      setErrors((current) => ({ ...current, tableName: "" }));
    },
    [disposeTableProfile, setErrors, setTables]
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
    [refreshTable, tables]
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
              }
            : column
        )
      );
    },
    [refreshTable, setWarnings, tables, t]
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
  };
}
