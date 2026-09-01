import React from "react";
import { MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAInput from "components/input/RAInput";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";

function AssessmentSetupSection({
  datasets,
  configurationOptions,
  scoringSystemOptions,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedConfigId,
  setSelectedConfigId,
  selectedScoringSystemId,
  setSelectedScoringSystemId,
  name,
  setName,
  description,
  setDescription,
  isEditMode,
  isReadOnly,
}) {
  const { t } = useTranslation();

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      <RAInput
        select
        label={t("datasetAssessments.form.datasetLabel")}
        value={selectedDatasetId}
        onChange={(event) => setSelectedDatasetId(event.target.value)}
        fullWidth
        required
        disabled={isReadOnly || isEditMode}
      >
        {datasets.map((dataset) => (
          <MenuItem key={dataset.id} value={dataset.id}>
            {dataset.name}
          </MenuItem>
        ))}
      </RAInput>

      <RAInput
        select
        label={t("datasetAssessments.form.configurationLabel")}
        value={selectedConfigId}
        onChange={(event) => setSelectedConfigId(event.target.value)}
        fullWidth
        required
        disabled={isReadOnly || isEditMode}
      >
        {configurationOptions.map((configuration) => (
          <MenuItem key={configuration.id} value={configuration.id}>
            <RABox display="flex" flexDirection="column">
              <RATypography variant="button" fontWeight="medium">
                {configuration.name} v
                {configuration.version || configuration.currentVersion || 1}
              </RATypography>
              {configuration.description && (
                <RATypography variant="caption" color="secondary">
                  {configuration.description}
                </RATypography>
              )}
            </RABox>
          </MenuItem>
        ))}
      </RAInput>

      <RAInput
        select
        label={t(
          "datasetAssessments.form.attributeScoringSystemLabel",
          "Attribute scoring system"
        )}
        value={selectedScoringSystemId}
        onChange={(event) => setSelectedScoringSystemId(event.target.value)}
        fullWidth
        required
        disabled={isReadOnly || isEditMode}
      >
        {scoringSystemOptions.map((system) => (
          <MenuItem key={system.id ?? "legacy"} value={system.id ?? ""}>
            <RABox display="flex" flexDirection="column">
              <RATypography variant="button" fontWeight="medium">
                {system.name} v{system.versionNumber || system.currentVersion || 1}
              </RATypography>
              {system.description && (
                <RATypography variant="caption" color="secondary">
                  {system.description}
                </RATypography>
              )}
            </RABox>
          </MenuItem>
        ))}
      </RAInput>

      <OnBlurRAInput
        label={t("datasetAssessments.form.assessmentNameLabel")}
        value={name}
        onCommit={setName}
        fullWidth
        required
        disabled={isReadOnly}
      />
      <OnBlurRAInput
        label={t("datasetAssessments.form.descriptionLabel")}
        value={description}
        onCommit={setDescription}
        fullWidth
        multiline
        minRows={3}
        disabled={isReadOnly}
      />
    </RABox>
  );
}

export default AssessmentSetupSection;
