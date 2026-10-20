// src/screens/datasets/AddDatasetForm/PreviewTable.js
import React, { useEffect, useMemo, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
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
import {
  AiColumnAssessmentInfo,
  ScreeningStatusLegend,
} from "./aiSuggestions/AiColumnAssessmentInfo";
import {
  AiScreeningProgress,
  LabeledLinearProgress,
} from "./aiSuggestions/AiScreeningProgress";
import { AI_TABLE_STATUS } from "./aiSuggestions/aiSuggestionTableState";
import {
  getTableReviewSummary,
  getTableScreenings,
} from "./aiSuggestions/screeningStatus";

// Narrower cell padding than the shared table default, so the columns fit
// without horizontal scrolling on desktop. Scoped to this table.
const previewTableContainerSx = {
  "& thead th, & tbody td": { px: 1.5 },
  "& tbody td": { verticalAlign: "middle" },
};

// Longer names do not fit the name input; they are shown in full on hover.
const NAME_TOOLTIP_MIN_LENGTH = 24;

function getSubsetProfilingStatus(file, { t, language }) {
  if (file.isManual || !file._qidProfilingSession) return null;

  if (file.isProfiling) {
    return t(
      "datasets.add.subsetProfilingUpdating",
      "Profiling Distinguishability evidence..."
    );
  }

  const summary = file.subsetProfilingSummary;
  if (!summary) return null;

  const attributeCount = Number(summary.candidateAttributeCount) || 0;
  const subsetCount = Number(summary.evaluatedSubsetCount) || 0;

  if (attributeCount < 2 || subsetCount <= 0) {
    return t(
      "datasets.add.noSubsetProfilingRequired",
      "No multi-attribute subset profiling was required."
    );
  }

  const formatter = new Intl.NumberFormat(language);

  return t(
    "datasets.add.subsetProfilingSummary",
    "{{subsetCount}} attribute subsets evaluated across {{attributeCount}} eligible attributes.",
    {
      subsetCount: formatter.format(subsetCount),
      attributeCount: formatter.format(attributeCount),
    }
  );
}

function buildTopValuesMap(columnMeta = [], data = []) {
  const map = {};
  const sampleData = data.slice(0, 500);

  for (const { field, sourceField } of columnMeta) {
    const frequencies = {};
    for (const row of sampleData) {
      const value = row[sourceField || field];
      if (value != null) {
        frequencies[value] = (frequencies[value] || 0) + 1;
      }
    }
    map[field] = Object.entries(frequencies)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([value]) => value);
  }

  return map;
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
  onConfirmScreening,
  aiState,
  aiEnabled,
}) {
  const { t, i18n } = useTranslation();
  const [bufferName, setBufferName] = useState(file.name);

  useEffect(() => {
    setBufferName(file.name);
  }, [file.name]);

  const { columnMeta = [], data = [] } = file;
  const subsetProfilingStatus = useMemo(
    () => getSubsetProfilingStatus(file, { t, language: i18n.language }),
    [file, i18n.language, t]
  );
  const topValuesMap = useMemo(
    () => buildTopValuesMap(columnMeta, data),
    [columnMeta, data]
  );

  if (file.isParsing) {
    return (
      <RABox
        mt={2}
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2,
          minHeight: 150,
          bgcolor: "action.hover",
        }}
      >
        {/* The CSV parser reports no percentage: indeterminate. */}
        <LabeledLinearProgress label={t("datasets.add.parsing", { name: file.name })} />
        {/* Header names can already be classified while the file is parsed. */}
        <AiScreeningProgress aiState={aiState} />
      </RABox>
    );
  }

  const isAiRunning =
    aiState.status === AI_TABLE_STATUS.LOADING_MODEL ||
    aiState.status === AI_TABLE_STATUS.CLASSIFYING;

  const columns = [
    {
      Header: t("datasets.attributesTable.index"),
      id: "rowIndex",
      width: 40,
      align: "center",
      Cell: ({ row }) => (
        <RATypography variant="caption">{row.original.position + 1}</RATypography>
      ),
    },
    {
      Header: t("datasets.attributesTable.name"),
      accessor: "field",
      align: "center",
      Cell: ({ row }) => (
        // Keeps the input readable: auto table layout otherwise lets the
        // name column shrink to make room for the examples.
        <RABox sx={{ minWidth: { xs: 200, md: 260, xl: 340 } }}>
          <MemoNameCell
            initialValue={row.original.field}
            tooltip={
              row.original.field.length >= NAME_TOOLTIP_MIN_LENGTH ? row.original.field : ""
            }
            onCommit={(newValue) =>
              onColumnNameChange(
                file._localTableId,
                row.original.columnKey,
                newValue
              )
            }
          />
        </RABox>
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
      align: "left",
      // Takes the width the other columns leave.
      width: "100%",
      Cell: ({ row }) => {
        const examples = (topValuesMap[row.original.field] || []).join(", ");
        if (!examples) {
          return <span style={{ color: "#ccc" }}>-</span>;
        }
        return (
          // The text is positioned absolutely, so it never widens the
          // column; it is truncated, and shown in full on hover.
          <Tooltip title={examples} placement="top" arrow>
            <RABox sx={{ position: "relative", minWidth: 160, height: "1.5em", fontSize: 12 }}>
              <RABox
                sx={{
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: "1.5em",
                }}
              >
                {examples}
              </RABox>
            </RABox>
          </Tooltip>
        );
      },
    },
    {
      Header: t("datasets.attributesTable.excluded"),
      accessor: "excluded",
      align: "center",
      Cell: ({ row }) => (
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
          {/* Fixed width keeps the checkboxes aligned. */}
          <RABox sx={{ width: 28, flexShrink: 0, display: "flex" }}>
            <AiColumnAssessmentInfo
              // Per column, so an open popover never moves to another row
              // when the page changes.
              key={row.original.columnKey}
              screening={row.original.screening}
              attributeName={row.original.field}
              excluded={row.original.excluded}
              onConfirm={() =>
                onConfirmScreening(file._localTableId, row.original.columnKey)
              }
            />
          </RABox>
        </RABox>
      ),
    },
    {
      Header: t("datasets.attributesTable.delete"),
      id: "delete",
      width: 48,
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

  const rows = getTableScreenings({ table: file, aiState, aiEnabled }).map(
    ({ column, columnKey, screening }, position) => ({
      columnKey,
      position,
      field: column.field,
      dataType: column.level,
      excluded: Boolean(column.excluded),
      screening,
    })
  );
  // Included potential direct identifiers awaiting review are profiled as
  // QID candidates until the researcher decides, so profiling is provisional.
  // Counts are hidden while classification runs (they are still changing).
  const reviewSummary = getTableReviewSummary(rows);
  const reviewCount = isAiRunning ? 0 : reviewSummary.required;
  const profilingStatus =
    subsetProfilingStatus && reviewCount > 0 && !file.isProfiling
      ? `${subsetProfilingStatus} ${t("datasets.add.subsetProfilingProvisional")}`
      : subsetProfilingStatus;
  // The progress line already says when AI screening is unavailable.
  const showNotScreened =
    !isAiRunning &&
    reviewSummary.notScreened > 0 &&
    aiState.status !== AI_TABLE_STATUS.UNAVAILABLE;
  const reviewKey = (name) => `datasets.aiSuggestions.review.${name}`;

  return (
    <RABox mt={2} p={2} data-preview-table>
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

      <RABox mb={1}>
        <AiScreeningProgress aiState={aiState} reviewCount={reviewCount} />
      </RABox>

      {showNotScreened && (
        <RATypography variant="caption" display="block" color="text" mb={1}>
          {t(reviewKey("notScreened"), {
            count: reviewSummary.notScreened,
            reason: t(reviewKey(`notScreenedReasons.${reviewSummary.notScreenedReason}`)),
          })}
        </RATypography>
      )}

      {profilingStatus && (
        <RATypography variant="caption" display="block" color="text" mb={1}>
          {profilingStatus}
        </RATypography>
      )}

      {rows.length > 0 && (
        <RABox mb={0.5}>
          <ScreeningStatusLegend />
        </RABox>
      )}

      <DataTable
        table={{ columns, rows }}
        canSearch={false}
        isSorted={false}
        pagination={{ variant: "gradient", color: "info" }}
        canAdd={true}
        onAddClick={() => onAddColumn(file._localTableId)}
        addButtonPosition="bottom-right"
        tableContainerSx={previewTableContainerSx}
      />
    </RABox>
  );
});
