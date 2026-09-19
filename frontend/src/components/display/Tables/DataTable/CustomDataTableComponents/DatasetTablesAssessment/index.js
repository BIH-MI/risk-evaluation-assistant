import React from "react";
import RABox from "components/layout/RABox";
import DataTable from "components/display/Tables/DataTable";
import RAInput from "components/input/RAInput";
import { useMaterialUIController } from "context";
import { useTranslation } from "react-i18next";
import { useDatasetAssessmentFormTableConfig } from "./useDatasetAssessmentFormTableConfig";

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

function DatasetTablesAssessment({
  tables,
  setTables,
  originals,
  showOverriddenColumn = false,
  scoringSystem = null,
  attributeEvidenceById = {},
  originalAssessmentValuesByAttributeId = {},
  isReadOnly = false,
}) {
  const { t } = useTranslation();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

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

          <RABox sx={{ overflowX: "auto", pb: 1, mb: 2 }}>
            <RABox sx={{ minWidth: "1050px" }}>
              <DataTable
                table={{
                  columns: columnsByTable[tbl.tableId],
                  rows: tbl.attributes,
                }}
                entriesPerPage={datasetAssessmentEntriesPerPage}
                searchColumnKey="name"
                searchPlaceholder={t(
                  "datasetAssessments.attributesTable.searchAttributes"
                )}
                onAddRow={() => addAttr(tbl.tableId)}
                tableContainerSx={darkMode ? undefined : lightTableContainerSx}
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
