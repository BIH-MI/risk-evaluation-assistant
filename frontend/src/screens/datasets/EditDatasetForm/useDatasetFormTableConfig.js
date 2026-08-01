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
 * @param {Array} tables
 * @param {Function} setTables
 * @param {boolean} disabled - Global disable flag (e.g. if lock lost or saving)
 * @param {Function} t - i18next translation function
 */
export function useDatasetFormTableConfig(
  tables,
  setTables,
  disabled = false,
  t
) {

  const changeAttr = useCallback(
    (tblId, attrId, changes) => {
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === tblId
            ? {
                ...tbl,
                attributes: tbl.attributes.map((a) =>
                  a.id === attrId ? { ...a, ...changes } : a
                ),
              }
            : tbl
        )
      );
    },
    [setTables]
  );

  const deleteAttr = useCallback(
    (tblId, attrId) => {
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === tblId
            ? {
                ...tbl,
                attributes: tbl.attributes.filter((a) => a.id !== attrId),
              }
            : tbl
        )
      );
    },
    [setTables]
  );

  const addAttr = useCallback(
    (tblId) => {
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === tblId
            ? {
                ...tbl,
                attributes: [
                  ...tbl.attributes,
                  {
                    id: `new-${Date.now()}`,
                    name: "",
                    dataType: "STRING",
                    isExcluded: false,
                  },
                ],
              }
            : tbl
        )
      );
    },
    [setTables]
  );

  const columnsByTable = useMemo(() => {
    const map = {};
    tables.forEach((tbl) => {
      map[tbl.id] = [
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
              onCommit={(val) =>
                changeAttr(tbl.id, row.original.id, { name: val })
              }
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
              onCommit={(val) =>
                changeAttr(tbl.id, row.original.id, { dataType: val })
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
              onCommit={(val) =>
                changeAttr(tbl.id, row.original.id, { excluded: val })
              }
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
              onClick={() => deleteAttr(tbl.id, row.original.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          ),
        },
      ];
    });
    return map;
  }, [
    tables,
    changeAttr,
    deleteAttr,
    disabled,
    t,
  ]);

  return { columnsByTable, addAttr, deleteAttr };
}
