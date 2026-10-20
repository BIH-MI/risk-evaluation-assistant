import React from "react";
import RABox from "components/layout/RABox";
import DataTable from "components/display/Tables/DataTable";
import RAInput from "components/input/RAInput";
import { useMaterialUIController } from "context";
import { useTranslation } from "react-i18next";
import { useDatasetAssessmentFormTableConfig } from "./useDatasetAssessmentFormTableConfig";
import {
  PAPER_SCREENSHOT_ROW_COUNT,
  usePaperScreenshotMode,
} from "./usePaperScreenshotMode";

const lightTableContainerSx = ({ borders }) => ({
  boxShadow: "none",
  border: `${borders.borderWidth[1]} solid`,
  borderColor: "divider",
  borderRadius: borders.borderRadius.xl,
  bgcolor: "background.paper",
  overflow: "hidden",
});

const lightTableFooterSx = ({ borders }) => ({
  boxShadow: "none",
  borderTop: `${borders.borderWidth[1]} solid`,
  borderColor: "divider",
  bgcolor: "background.paper",
});

const datasetAssessmentEntriesPerPage = Object.freeze({
  defaultValue: "all",
  entries: [10, 15, 20, 25],
  allowAll: true,
});

// ?paperScreenshot=1 (development only): the first six attributes in their
// current order (presentation only; the assessment state is not sliced),
// without pagination or footer, in compact rows on a white surface.
const paperScreenshotContainerSx = {
  boxShadow: "none",
  border: "1px solid #dee2e6",
  borderRadius: "6px",
  bgcolor: "#ffffff",
  overflow: "hidden",
};

const DARK_TEXT = "#344767";

// Scoped to this table; selectors outrank the cells' own padding classes.
const paperScreenshotTableSx = {
  "& table": { width: "100%" },
  "& thead th": {
    px: 1,
    borderBottom: "1px solid #dee2e6",
  },
  // Narrower attribute names than the regular table (30%).
  "& thead th:first-of-type": { width: "18%" },
  "& thead th > div": {
    py: "8px",
    color: DARK_TEXT,
    opacity: 1,
    fontSize: "0.75rem",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  },
  // Sort arrows are decoration in a static figure.
  "& thead th .MuiIcon-root": { display: "none" },
  "& tbody td": {
    py: "6px",
    px: 1,
    borderBottom: "1px solid #e9ecef",
  },
  "& tbody td .MuiOutlinedInput-root": { height: 34 },
  "& tbody td:first-of-type .MuiOutlinedInput-input": {
    padding: "6px 10px",
    fontSize: "0.875rem",
    color: DARK_TEXT,
  },
  "& tbody td .MuiSelect-select": { padding: "4px 8px !important" },
  "& tbody td .MuiCheckbox-root": { p: "4px" },
};

function DatasetTablesAssessment({
  tables,
  setTables,
  originals,
  showOverriddenColumn = false,
  scoringSystem = null,
  attributeEvidenceById = {},
  originalAssessmentValuesByAttributeId = {},
  isReadOnly = false,
  // Shows only the first `maxRows` attributes of each table, without
  // pagination. Presentation only; the assessment state is not sliced.
  maxRows = null,
}) {
  const { t } = useTranslation();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const paperScreenshot = usePaperScreenshotMode();
  const rowLimit =
    maxRows ?? (paperScreenshot ? PAPER_SCREENSHOT_ROW_COUNT : null);

  const { columnsByTable, addAttr } = useDatasetAssessmentFormTableConfig(
    tables,
    setTables,
    originals,
    {
      showOverridden: showOverriddenColumn,
      scoringSystem,
      attributeEvidenceById,
      originalAssessmentValuesByAttributeId,
      isReadOnly,
    },
    t
  );

  return (
    <>
      {tables.map((tbl) => (
        <RABox key={tbl.tableId} mb={4}>
          <RABox
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={1}
          >
            <RAInput
              label={t("datasetAssessments.attributesTable.tableName")}
              value={tbl.tableName}
              disabled
              variant="standard"
              sx={{ maxWidth: 300 }}
            />
          </RABox>

          <RABox
            sx={
              paperScreenshot
                ? { pb: 0, mb: 2 }
                : { overflowX: "auto", pb: 1, mb: 2 }
            }
          >
            <RABox
              sx={paperScreenshot ? paperScreenshotTableSx : { minWidth: "1050px" }}
            >
              <DataTable
                table={{
                  columns: columnsByTable[tbl.tableId],
                  rows:
                    rowLimit !== null
                      ? tbl.attributes.slice(0, rowLimit)
                      : tbl.attributes,
                }}
                showAllEntries={rowLimit !== null}
                entriesPerPage={datasetAssessmentEntriesPerPage}
                searchColumnKey="name"
                searchPlaceholder={t(
                  "datasetAssessments.attributesTable.searchAttributes"
                )}
                onAddRow={() => addAttr(tbl.tableId)}
                tableContainerSx={
                  paperScreenshot
                    ? paperScreenshotContainerSx
                    : darkMode
                      ? undefined
                      : lightTableContainerSx
                }
                footerSx={darkMode ? undefined : lightTableFooterSx}
              />
            </RABox>
          </RABox>
        </RABox>
      ))}
    </>
  );
}

export default DatasetTablesAssessment;
