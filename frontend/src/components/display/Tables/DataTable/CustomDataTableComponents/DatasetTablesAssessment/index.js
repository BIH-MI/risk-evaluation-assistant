import React, { useState } from "react";
import { FormControlLabel, Checkbox } from "@mui/material";
import RABox from "components/layout/RABox";
import DataTable from "components/display/Tables/DataTable";
import RAInput from "components/input/RAInput";
import { useTranslation } from "react-i18next";
import { useDatasetAssessmentFormTableConfig } from "./useDatasetAssessmentFormTableConfig";

function DatasetTablesAssessment({
  tables,
  setTables,
  originals,
  showShowExcludedCheckbox = true,
  showOverriddenColumn = false,
}) {
  const { t } = useTranslation();

  const { columnsByTable, addAttr } = useDatasetAssessmentFormTableConfig(
    tables,
    setTables,
    originals,
    { showOverridden: showOverriddenColumn },
    t
  );

  const [showExcluded, setShowExcluded] = useState(false);

  const getRowProps = (row) => ({
    sx: row.original?.isExcluded
      ? { backgroundColor: "rgba(255, 0, 0, 0.1)" }
      : {},
  });

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
            {showShowExcludedCheckbox && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showExcluded}
                    onChange={(e) => setShowExcluded(e.target.checked)}
                    color="primary"
                  />
                }
                label={t(
                  "datasetAssessments.attributesTable.showExcludedFields"
                )}
                sx={{ m: 0 }}
              />
            )}
          </RABox>

          {/* FIX: Wrapper to prevent columns and inputs from squishing on small screens */}
          <RABox sx={{ overflowX: "auto", pb: 1, mb: 2 }}>
            <RABox sx={{ minWidth: "1050px" }}>
              <DataTable
                table={{
                  columns: columnsByTable[tbl.tableId],
                  rows: showExcluded
                    ? tbl.attributes
                    : tbl.attributes.filter((attr) => !attr.isExcluded),
                }}
                searchColumnKey="name"
                searchPlaceholder={t(
                  "datasetAssessments.attributesTable.searchAttributes"
                )}
                onAddRow={() => addAttr(tbl.tableId)}
                rowProps={getRowProps}
              />
            </RABox>
          </RABox>
        </RABox>
      ))}
    </>
  );
}

export default DatasetTablesAssessment;
