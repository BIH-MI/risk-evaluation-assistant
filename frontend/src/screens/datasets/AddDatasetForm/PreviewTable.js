// src/screens/datasets/AddDatasetForm/PreviewTable.js
import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
import { describeExclusionDecision } from "qidDiscovery/directIdentifierPolicy";
import RAInput from "../../../components/input/RAInput";

const getColumnIdentity = (column = {}) => column.sourceField || column.field;

/**
 * Loader text for one uploading table. Stages come from the QID worker (or the synchronous
 * fallback); there is no meaningful percentage, so the spinner stays indeterminate.
 */
function processingMessage(t, file) {
  const name = file.name;
  const rows = Number.isFinite(file.processingRowCount)
    ? file.processingRowCount.toLocaleString()
    : null;
  switch (file.processingStage) {
    case "queued":
      return t("datasets.add.processingQueued", "Waiting to process {{name}}…", { name });
    case "parsing":
      return t("datasets.add.processingReading", "Reading {{name}}…", { name });
    case "profiling":
      return rows
        ? t("datasets.add.processingProfilingRows", "Profiling {{rows}} rows of {{name}}…", { name, rows })
        : t("datasets.add.processingProfiling", "Profiling {{name}}…", { name });
    case "qid-discovery":
      return t("datasets.add.processingQid", "Running QID discovery for {{name}}…", { name });
    case "preparing":
      return t("datasets.add.processingPreparing", "Preparing preview of {{name}}…", { name });
    default:
      return t("datasets.add.processing", "Processing {{name}}…", { name });
  }
}

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
  const subjectKeySourceField = file.subjectKeySourceField || null;
  // The subject key is chosen automatically during profiling and only groups repeated
  // observations of the same subject for Replicability; it is shown in the tooltip of its
  // attribute. It is not a QID candidate and may be excluded from QID discovery.
  const replicabilityLines = useMemo(() => {
    if (!subjectKeySourceField) return [];
    if (file.isProfiling) {
      return [t("datasets.add.subjectKeyUpdating", "Replicability subject key: updating…")];
    }

    const summary = file.repeatedMeasurementSummary;
    const title = file.subjectKeyAutoDetected
      ? t("datasets.add.subjectKeyAutoDetected", "Replicability subject key: {{field}} (auto-detected).", {
          field: subjectKeySourceField,
        })
      : t("datasets.add.subjectKeySelected", "Replicability subject key: {{field}}.", {
          field: subjectKeySourceField,
        });
    const detail = summary?.hasRepeatedMeasurements
      ? t("datasets.add.subjectKeyRepeated", "{{repeated}} of {{subjects}} subjects have repeated observations.", {
          repeated: summary.subjectsWithRepeatedMeasurements.toLocaleString(),
          subjects: summary.subjectCount.toLocaleString(),
        })
      : t("datasets.add.subjectKeyNoRepeats", "No subject has repeated observations.");
    return [title, detail];
  }, [
    file.isProfiling,
    file.repeatedMeasurementSummary,
    file.subjectKeyAutoDetected,
    subjectKeySourceField,
    t,
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
        <RABox sx={{ ml: 2 }}>
          <RATypography variant="body2">{processingMessage(t, file)}</RATypography>
          <RATypography variant="caption" display="block" sx={{ color: "text.secondary" }}>
            {t(
              "datasets.add.processingHint",
              "Parsing and profiling run in the background. Large files may take a moment."
            )}
          </RATypography>
        </RABox>
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
      Cell: ({ row }) => {
        const { exclusionInfo } = row.original;
        return (
          <RABox display="flex" alignItems="center" justifyContent="center" gap={0.5}>
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
            {exclusionInfo && (
              <Tooltip
                arrow
                title={
                  <RABox color="inherit">
                    {exclusionInfo.lines.map((line) => (
                      <RATypography key={line} variant="caption" color="inherit" display="block">
                        {line}
                      </RATypography>
                    ))}
                  </RABox>
                }
              >
                <InfoOutlinedIcon
                  fontSize="small"
                  tabIndex={0}
                  aria-label={exclusionInfo.lines.join(" ")}
                  sx={{ cursor: "help", color: "info.main" }}
                />
              </Tooltip>
            )}
          </RABox>
        );
      },
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

  const rows = columnMeta.map((column) => {
    // Automatic exclusion reason, plus the Replicability role when this attribute is the
    // subject key. Attributes with neither get no info icon.
    const exclusionReason = describeExclusionDecision(t, column);
    const isSubjectKey =
      Boolean(subjectKeySourceField) && getColumnIdentity(column) === subjectKeySourceField;
    const lines = [
      ...(exclusionReason ? [exclusionReason] : []),
      ...(isSubjectKey ? replicabilityLines : []),
    ];
    return {
      columnKey: getColumnIdentity(column),
      field: column.field,
      dataType: column.level,
      excluded: Boolean(column.excluded),
      exclusionInfo: lines.length > 0 ? { lines } : null,
    };
  });

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
