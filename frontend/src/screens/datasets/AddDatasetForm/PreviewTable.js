// src/screens/datasets/AddDatasetForm/PreviewTable.js
import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import DataTable from "components/display/Tables/DataTable";
import RABox from "components/layout/RABox";
import {
  MemoNameCell,
  MemoDataTypeCell,
  MemoCheckboxCell,
} from "components/display/Tables/DataTable/CustomDataTableComponents/RowComponents";
import RATypography from "../../../components/display/RATypography";
import RAInput from "../../../components/input/RAInput";

const getColumnIdentity = (column = {}) => column.sourceField || column.field;

export const PreviewTable = React.memo(function PreviewTable({
  file,
  onRemove,
  onTableNameChange,
  onColumnNameChange,
  onDataTypeChange,
  onExcludedChange,
  onAddColumn,
  onDeleteColumn,
}) {
  const { t } = useTranslation();
  const [bufferName, setBufferName] = useState(file.name);

  useEffect(() => {
    setBufferName(file.name);
  }, [file.name]);

  const { columnMeta = [], data = [] } = file;
  const topValuesMap = useMemo(() => {
    const map = {};
    const sampleData = data.slice(0, 500);

    for (const { field, sourceField } of columnMeta) {
      const freq = {};
      for (const row of sampleData) {
        const v = row[sourceField || field];
        if (v != null) freq[v] = (freq[v] || 0) + 1;
      }
      const top3 = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([val]) => val);
      map[field] = top3;
    }
    return map;
  }, [columnMeta, data]);

  if (file.isParsing) {
    return (
      <RABox
        key={file._localTableId}
        mt={2}
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 150,
          bgcolor: "action.hover",
        }}
      >
        <CircularProgress size={24} />
        <RATypography variant="body2" sx={{ ml: 2 }}>
          {t("datasets.add.parsing", { name: file.name })}
        </RATypography>
      </RABox>
    );
  }

  const columns = [
    {
      Header: t("datasets.attributesTable.index"),
      id: "rowIndex",
      width: 50,
      align: "center",
      Cell: ({ row }) => (
        <RATypography variant="caption">{row.index + 1}</RATypography>
      ),
    },
    {
      Header: t("datasets.attributesTable.name"),
      accessor: "field",
      align: "center",
      width: 300,
      Cell: ({ row }) => (
        <MemoNameCell
          initialValue={row.original.field}
          onCommit={(newValue) =>
            onColumnNameChange(
              file._localTableId,
              row.original.columnKey,
              newValue
            )
          }
        />
      ),
    },
    {
      Header: t("datasets.attributesTable.dataType"),
      accessor: "dataType",
      align: "center",
      Cell: ({ row }) => (
        <MemoDataTypeCell
          initialValue={row.original.dataType}
          onCommit={(newType) =>
            onDataTypeChange(
              file._localTableId,
              row.original.columnKey,
              newType
            )
          }
        />
      ),
    },
    {
      Header: t("datasets.add.examples"),
      accessor: "examples",
      align: "center",
      Cell: ({ row }) => {
        const vals = topValuesMap[row.original.field] || [];
        return (
          <RABox
            sx={{
              fontSize: 12,
              pl: 1,
              width: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {vals.length > 0 ? (
              vals.join(", ")
            ) : (
              <span style={{ color: "#ccc" }}>-</span>
            )}
          </RABox>
        );
      },
    },
    {
      Header: t("datasets.attributesTable.excluded"),
      accessor: "excluded",
      align: "center",
      Cell: ({ row }) => (
        <MemoCheckboxCell
          initialValue={row.original.excluded}
          onCommit={(checked) =>
            onExcludedChange(
              file._localTableId,
              row.original.columnKey,
              checked
            )
          }
        />
      ),
    },
    {
      Header: t("datasets.attributesTable.delete"),
      id: "delete",
      width: 50,
      align: "center",
      Cell: ({ row }) => (
        <IconButton
          size="small"
          color="error"
          onClick={() =>
            onDeleteColumn(file._localTableId, row.original.columnKey)
          }
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const rows = columnMeta.map((column) => ({
    columnKey: getColumnIdentity(column),
    field: column.field,
    dataType: column.level,
    excluded: Boolean(column.excluded),
  }));

  return (
    <RABox key={file._localTableId} mt={2} p={2}>
      <RABox
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        mb={1}
      >
        <RAInput
          label={t("datasets.form.tableName")}
          value={bufferName}
          onChange={(e) => setBufferName(e.target.value)}
          onBlur={() => {
            const ok = onTableNameChange(file._localTableId, bufferName);
            if (!ok) setBufferName(file.name);
          }}
          fullWidth
          sx={{ maxWidth: 250 }}
          variant="standard"
        />

        <IconButton
          size="small"
          onClick={() => onRemove(file._localTableId)}
          sx={{
            bgcolor: "error.main",
            color: "#fff",
            "&:hover": { bgcolor: "error.dark" },
            width: 28,
            height: 28,
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </RABox>

      <DataTable
        table={{ columns, rows }}
        canSearch={false}
        isSorted={false}
        pagination={{ variant: "gradient", color: "info" }}
        canAdd={true}
        onAddClick={() => onAddColumn(file._localTableId)}
        addButtonPosition="bottom-right"
      />
    </RABox>
  );
});
