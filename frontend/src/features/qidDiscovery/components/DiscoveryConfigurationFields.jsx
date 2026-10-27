import React from "react";
import { MenuItem } from "@mui/material";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAInput from "components/input/RAInput";
import { getColumnClassifierModel } from "../ai/modelConfig";

/** Configuration and model selectors retain the form's existing selection locks. */
export function DiscoveryConfigurationFields({
  t,
  selectedQidDiscoveryConfigurationId,
  setSelectedQidDiscoveryConfigurationId,
  qidConfigurationsLoading,
  tables,
  selectedQidDiscoveryConfigurationError,
  qidDiscoveryConfigurations,
  aiScreeningEnabled,
  selectedAiModelId,
  setSelectedAiModelId,
  aiModelsLoading,
  allowAiModelSelection,
  aiModelUnavailableReason,
  aiModels,
  defaultAiModelId,
}) {
  return (
    <>
      <RAInput
        select
        label={t("datasets.form.qidDiscoveryConfigurationLabel")}
        value={selectedQidDiscoveryConfigurationId}
        onChange={(event) =>
          setSelectedQidDiscoveryConfigurationId(event.target.value)
        }
        fullWidth
        disabled={qidConfigurationsLoading || tables.length > 0}
        error={Boolean(selectedQidDiscoveryConfigurationError)}
        helperText={
          selectedQidDiscoveryConfigurationError
            ? t("datasets.alerts.qidConfigurationInvalid")
            : ""
        }
      >
        {qidDiscoveryConfigurations.map((configuration) => (
          <MenuItem key={configuration.id} value={String(configuration.id)}>
            <RABox display="flex" flexDirection="column">
              <RATypography variant="button">{configuration.name}</RATypography>
              <RATypography variant="caption" color="text">
                {t(
                  "datasets.form.qidDiscoveryConfigurationSummary",
                  "Max subset size {{maxSubsetSize}}, limit {{maxEvaluatedSubsets}} subsets",
                  {
                    maxSubsetSize:
                      configuration.profiling?.maxSubsetSize ?? "-",
                    maxEvaluatedSubsets:
                      configuration.profiling?.maxEvaluatedSubsets ?? "-",
                  }
                )}
              </RATypography>
            </RABox>
          </MenuItem>
        ))}
      </RAInput>

      {aiScreeningEnabled && (
        <RAInput
          select
          label={t("datasets.form.aiModelLabel", "AI Model")}
          value={selectedAiModelId ?? ""}
          onChange={(event) => setSelectedAiModelId(event.target.value)}
          fullWidth
          // One model per dataset: results of different models are not mixed.
          // Researchers choose only when more than one model is usable;
          // otherwise the configured default is used automatically.
          disabled={
            aiModelsLoading || !allowAiModelSelection || tables.length > 0
          }
          helperText={
            !aiModelsLoading &&
            aiModelUnavailableReason &&
            (!aiModels.length || !selectedAiModelId)
              ? t(
                  aiModels.length
                    ? "datasets.form.aiModelDefaultUnavailable"
                    : "datasets.form.aiModelUnavailable",
                  {
                    model:
                      getColumnClassifierModel(aiModelUnavailableReason.modelId)
                        ?.displayName || aiModelUnavailableReason.modelId,
                    reason: t(
                      `qidDiscoveryConfiguration.aiScreening.installation.${aiModelUnavailableReason.reason}`,
                      { detail: aiModelUnavailableReason.detail }
                    ),
                  }
                )
              : !aiModelsLoading && !aiModels.length
              ? t(
                  "datasets.form.aiModelNoneAvailable",
                  "No AI model is available. Review the attributes manually."
                )
              : tables.length > 0
              ? t(
                  "datasets.form.aiModelLocked",
                  "The AI model cannot be changed after tables have been added, so that all tables of this dataset are assessed by the same model. Remove all tables to change it."
                )
              : !allowAiModelSelection
              ? t(
                  "datasets.form.aiModelFromConfiguration",
                  "Set by the selected QID Discovery configuration. The model analyses column names locally in your browser."
                )
              : t(
                  "datasets.form.aiModelHelper",
                  "The model analyses column names locally in your browser. Column names and data values are never sent to external services."
                )
          }
        >
          {aiModels.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              <RABox display="flex" flexDirection="column">
                <RATypography variant="button">
                  {model.id === defaultAiModelId
                    ? t(
                        "datasets.form.aiModelDefaultName",
                        "{{name}} (Default)",
                        {
                          name: model.displayName,
                        }
                      )
                    : model.displayName}
                </RATypography>
                <RATypography variant="caption" color="text">
                  {model.autoExclusionApproved
                    ? t("datasets.form.aiModelApproved")
                    : model.configurationEvaluated
                    ? t("datasets.form.aiModelEvaluated")
                    : t("datasets.form.aiModelNotEvaluated")}
                </RATypography>
              </RABox>
            </MenuItem>
          ))}
        </RAInput>
      )}
    </>
  );
}
