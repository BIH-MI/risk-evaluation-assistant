import React from "react";
import PropTypes from "prop-types";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useTranslation } from "react-i18next";

import DatasetTablesAssessment from "components/display/Tables/DataTable/CustomDataTableComponents/DatasetTablesAssessment";
import ActivityFormSection from "./ActivityFormSection";

/**
 * Optional activity-specific values for the attributes of the selected Dataset Assessment. Shown
 * once that assessment has loaded, because the override tables are copied from it.
 */
export default function TableOverridesSection({ tableOverrides, disabled }) {
  const { t } = useTranslation();
  if (!tableOverrides.canOverride) return null;

  return (
    <ActivityFormSection title={t("dataSharingActivities.form.datasetTablesAssessment")}>
      <FormControlLabel
        control={
          <Checkbox
            checked={tableOverrides.overrideTables}
            onChange={(event) => tableOverrides.toggleOverride(event.target.checked)}
            disabled={disabled}
          />
        }
        label={t("dataSharingActivities.form.overrideTablesLabel")}
      />

      {tableOverrides.overrideTables && (
        <DatasetTablesAssessment
          tables={tableOverrides.tables}
          setTables={tableOverrides.setTables}
          isReadOnly={disabled}
          scoringSystem={tableOverrides.scoringSystem}
          attributeEvidenceById={tableOverrides.attributeEvidenceById}
          originalAssessmentValuesByAttributeId={tableOverrides.originalAssessmentValuesByAttributeId}
        />
      )}
    </ActivityFormSection>
  );
}

TableOverridesSection.propTypes = {
  tableOverrides: PropTypes.shape({
    canOverride: PropTypes.bool.isRequired,
    overrideTables: PropTypes.bool.isRequired,
    tables: PropTypes.array.isRequired,
    setTables: PropTypes.func.isRequired,
    toggleOverride: PropTypes.func.isRequired,
    scoringSystem: PropTypes.object,
    attributeEvidenceById: PropTypes.object,
    originalAssessmentValuesByAttributeId: PropTypes.object,
  }).isRequired,
  disabled: PropTypes.bool.isRequired,
};
