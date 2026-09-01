import { useCallback, useMemo } from "react";
import { IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";

import RATypography from "../../../components/display/RATypography";
import {
  MemoNameCell,
  MemoDataTypeCell,
  MemoCheckboxCell,
} from "../../../components/display/Tables/DataTable/CustomDataTableComponents/RowComponents";

/**
 * Hook to configure editable columns for dataset tables.
 * @param {Object} options
 * @param {Array} options.tables
 * @param {Function} options.setTables
 * @param {boolean} [options.disabled=false] - Global disable flag, e.g. when the lock is lost or the form is saving.
 * @param {Function} options.t - i18next translation function.
 * @param {Function} [options.onExcludedChange] - Optional domain-aware exclusion handler.
 * @param {Function} [options.onAttributeNameChange] - Optional domain-aware rename handler.
 */
export function useDatasetFormTableConfig({
  tables = [],
  setTables,
  disabled = false,
  t,
  onExcludedChange,
  onAttributeNameChange,
} = {}) {
  const changeAttr = useCallback(
    (tableId, attributeId, changes) => {
      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId
            ? {
                ...table,
                attributes: table.attributes.map((attribute) =>
                  attribute.id === attributeId
                    ? { ...attribute, ...changes }
                    : attribute
                ),
              }
            : table
        )
      );
    },
    [setTables]
  );

  const changeExcluded = useCallback(
    (table, attribute, excluded) => {
      if (onExcludedChange) {
        onExcludedChange(table, attribute, excluded);
        return;
      }

      changeAttr(table.id, attribute.id, { excluded });
    },
    [changeAttr, onExcludedChange]
  );

  const changeName = useCallback(
    (table, attribute, name) => {
      if (onAttributeNameChange) {
        onAttributeNameChange(table, attribute, name);
        return;
      }

      changeAttr(table.id, attribute.id, { name });
    },
    [changeAttr, onAttributeNameChange]
  );

  const deleteAttr = useCallback(
    (tableId, attributeId) => {
      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId
            ? {
                ...table,
                attributes: table.attributes.filter(
                  (attribute) => attribute.id !== attributeId
                ),
              }
            : table
        )
      );
    },
    [setTables]
  );

  const addAttr = useCallback(
    (tableId) => {
      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId
            ? {
                ...table,
                attributes: [
                  ...table.attributes,
                  {
                    id: `new-${Date.now()}`,
                    name: "",
                    dataType: "STRING",
                    excluded: false,
                  },
                ],
              }
            : table
        )
      );
    },
    [setTables]
  );

  const columnsByTable = useMemo(() => {
    const map = {};
    tables.forEach((table) => {
      map[table.id] = [
        {
          Header: t("datasets.attributesTable.index"),
          id: "rowIndex",
          align: "center",
          width: 50,
          Cell: ({ row }) => (
            <RATypography variant="caption">{row.index + 1}</RATypography>
          ),
        },
        {
          Header: t("datasets.attributesTable.name"),
          accessor: "name",
          align: "center",
          width: 250,
          Cell: ({ row }) => (
            <MemoNameCell
              initialValue={row.original.name}
              disabled={disabled}
              onCommit={(value) => changeName(table, row.original, value)}
            />
          ),
        },
        {
          Header: t("datasets.attributesTable.dataType"),
          accessor: "dataType",
          align: "center",
          width: 200,
          Cell: ({ row }) => (
            <MemoDataTypeCell
              initialValue={row.original.dataType}
              disabled={disabled}
              onCommit={(value) =>
                changeAttr(table.id, row.original.id, { dataType: value })
              }
            />
          ),
        },
        {
          Header: t("datasets.attributesTable.excluded"),
          accessor: "excluded",
          align: "center",
          width: 100,
          Cell: ({ row }) => (
            <MemoCheckboxCell
              initialValue={row.original.excluded}
              disabled={disabled}
              onCommit={(value) => changeExcluded(table, row.original, value)}
            />
          ),
        },
        {
          Header: t("datasets.attributesTable.delete"),
          id: "delete",
          align: "center",
          width: 80,
          Cell: ({ row }) => (
            <IconButton
              size="small"
              color="error"
              disabled={disabled}
              onClick={() => deleteAttr(table.id, row.original.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          ),
        },
      ];
    });
    return map;
  }, [tables, changeAttr, changeExcluded, changeName, deleteAttr, disabled, t]);

  return { columnsByTable, addAttr };
}
