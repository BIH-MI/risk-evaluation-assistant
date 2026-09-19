// src/screens/datasets/AddDatasetForm/PreviewTable.js
import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress, IconButton, MenuItem } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import DataTable from "components/display/Tables/DataTable";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
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
  onSubjectKeyChange,
}) {
  const { t } = useTranslation();
  const [bufferName, setBufferName] = useState(file.name);
  const [showSubjectKeySelect, setShowSubjectKeySelect] = useState(false);

  useEffect(() => {
    setBufferName(file.name);
  }, [file.name]);

  const { columnMeta = [], data = [] } = file;
  const suggestedSubjectKeys = useMemo(
    () => new Set(file.suggestedSubjectKeySourceFields || []),
    [file.suggestedSubjectKeySourceFields]
  );
  const subjectKeyOptions = useMemo(() => {
    const seen = new Set();

    return columnMeta
      .map((column, index) => ({
        sourceField: getColumnIdentity(column),
        index,
      }))
      .filter(({ sourceField }) => {
        if (!sourceField || seen.has(sourceField)) return false;
        seen.add(sourceField);
        return true;
      })
      .map((option) => ({
        ...option,
        suggested: suggestedSubjectKeys.has(option.sourceField),
      }))
      .sort((a, b) => {
        if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
        return a.index - b.index;
      });
  }, [columnMeta, suggestedSubjectKeys]);
  const selectedSubjectKey = file.subjectKeySourceField || "";
  const subjectKeyStatus = useMemo(() => {
    if (file.isProfiling) return "Replicability key: updating...";
    if (!selectedSubjectKey) return "Replicability key: not set";

    const summary = file.repeatedMeasurementSummary;
    const autoDetected = file.subjectKeyAutoDetected ? " (auto-detected)" : "";

    if (summary?.hasRepeatedMeasurements) {
      return `Replicability key: ${selectedSubjectKey}${autoDetected} · ${summary.subjectsWithRepeatedMeasurements}/${summary.subjectCount} repeated`;
    }

    return `Replicability key: ${selectedSubjectKey}${autoDetected} · no repeated observations`;
  }, [
    file.isProfiling,
    file.repeatedMeasurementSummary,
    file.subjectKeyAutoDetected,
    selectedSubjectKey,
  ]);

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

      <RABox display="flex" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
        <RATypography variant="caption" color="text">
          {subjectKeyStatus}
        </RATypography>
        <RAButton
          type="button"
          variant="text"
          size="small"
          disabled={file.isParsing || file.isProfiling}
          onClick={() => setShowSubjectKeySelect((current) => !current)}
          sx={{ minWidth: 0, px: 1, py: 0.25 }}
        >
          {selectedSubjectKey ? "Change" : "Set"}
        </RAButton>
        {showSubjectKeySelect && (
          <RAInput
            select
            value={selectedSubjectKey}
            onChange={(event) => {
              onSubjectKeyChange(
                file._localTableId,
                event.target.value || null
              );
              setShowSubjectKeySelect(false);
            }}
            disabled={file.isParsing || file.isProfiling}
            size="small"
            sx={{ minWidth: 220 }}
            variant="standard"
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">None</MenuItem>
            {subjectKeyOptions.map(({ sourceField, suggested }) => (
              <MenuItem key={sourceField} value={sourceField}>
                {suggested ? `${sourceField} (suggested)` : sourceField}
              </MenuItem>
            ))}
          </RAInput>
        )}
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
