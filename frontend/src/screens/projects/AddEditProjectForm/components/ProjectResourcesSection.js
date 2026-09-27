import React from "react";
import PropTypes from "prop-types";
import { Autocomplete, Checkbox, FormControlLabel, Paper, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

const projectSectionPaperSx = {
  p: { xs: 2.5, md: 3 },
  borderRadius: 2,
  bgcolor: ({ palette }) =>
    palette.background.card || palette.background.paper || palette.background.default,
  color: ({ palette }) => palette.text.main || palette.text.primary,
  border: "1px solid",
  borderColor: "divider",
};

function knowledgeBaseLabel(knowledgeBase, t) {
  if (!knowledgeBase) return "";
  const version = knowledgeBase.currentVersion ? ` — v${knowledgeBase.currentVersion}` : "";
  const suffix = knowledgeBase.defaultKnowledgeBase ? ` (${t("projects.form.mitigationKnowledgeBaseDefault")})` : "";
  return `${knowledgeBase.name || ""}${version}${suffix}`;
}

export default function ProjectResourcesSection({
  datasets,
  recipients,
  mitigationKnowledgeBases,
  selectedDatasets,
  selectedRecipients,
  selectedMitigationKnowledgeBase,
  sharedUsers,
  disabled,
  knowledgeBasesLoading,
  upgradeMitigationKnowledgeBaseVersion,
  onDatasetsChange,
  onRecipientsChange,
  onMitigationKnowledgeBaseChange,
  onUpgradeMitigationKnowledgeBaseVersionChange,
  onSharedUsersChange,
}) {
  const { t } = useTranslation();
  const pinned = selectedMitigationKnowledgeBase?.pinnedVersion ? selectedMitigationKnowledgeBase : null;

  return (
    <Paper
      elevation={1}
      sx={projectSectionPaperSx}
    >
      <RABox display="flex" flexDirection="column" gap={2}>
        <RABox>
          <RATypography
            variant="h6"
            sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
          >
            {t("projects.form.resourcesTitle")}
          </RATypography>
          <RATypography
            variant="body2"
            sx={{ color: ({ palette }) => palette.text.main || palette.text.secondary }}
          >
            {t("projects.form.resourcesDescription")}
          </RATypography>
        </RABox>

        <Autocomplete
          multiple
          options={datasets}
          value={selectedDatasets}
          onChange={onDatasetsChange}
          getOptionLabel={(option) => option.name || ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          disabled={disabled}
          renderInput={(params) => (
            <TextField {...params} label={t("projects.form.datasetsLabel")} />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <LabeledAvatar value={option.name} variant="dataset" />
            </li>
          )}
        />

        <Autocomplete
          multiple
          options={recipients}
          value={selectedRecipients}
          onChange={onRecipientsChange}
          getOptionLabel={(option) => option.name || ""}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          disabled={disabled}
          renderInput={(params) => (
            <TextField {...params} label={t("projects.form.recipientsLabel")} />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <LabeledAvatar value={option.name} variant="organization" />
            </li>
          )}
        />

        <Autocomplete
          options={mitigationKnowledgeBases}
          value={selectedMitigationKnowledgeBase}
          onChange={onMitigationKnowledgeBaseChange}
          getOptionLabel={(option) => knowledgeBaseLabel(option, t)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          loading={knowledgeBasesLoading}
          disableClearable={Boolean(selectedMitigationKnowledgeBase)}
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t("projects.form.mitigationKnowledgeBaseLabel")}
              helperText={
                pinned
                  ? t("projects.form.mitigationKnowledgeBasePinned", { version: pinned.pinnedVersion })
                  : t("projects.form.mitigationKnowledgeBaseHelper")
              }
            />
          )}
        />
        {pinned && pinned.latestVersion > pinned.pinnedVersion && (
          <FormControlLabel
            control={
              <Checkbox
                checked={upgradeMitigationKnowledgeBaseVersion}
                onChange={onUpgradeMitigationKnowledgeBaseVersionChange}
                disabled={disabled}
              />
            }
            label={t("projects.form.mitigationKnowledgeBaseUpgrade", { version: pinned.latestVersion })}
          />
        )}

        <RAUserAutocomplete
          multiple
          label={t("projects.form.sharedWithLabel")}
          value={sharedUsers}
          onChange={onSharedUsersChange}
          placeholder={t("projects.form.searchUsersPlaceholder")}
          disabled={disabled}
        />
        <RATypography
          variant="caption"
          sx={{ color: ({ palette }) => palette.text.main || palette.text.secondary }}
        >
          {t("projects.form.sharedWithHelper")}
        </RATypography>
      </RABox>
    </Paper>
  );
}

ProjectResourcesSection.propTypes = {
  datasets: PropTypes.array.isRequired,
  recipients: PropTypes.array.isRequired,
  mitigationKnowledgeBases: PropTypes.array.isRequired,
  selectedDatasets: PropTypes.array.isRequired,
  selectedRecipients: PropTypes.array.isRequired,
  selectedMitigationKnowledgeBase: PropTypes.object,
  sharedUsers: PropTypes.array.isRequired,
  disabled: PropTypes.bool.isRequired,
  knowledgeBasesLoading: PropTypes.bool,
  upgradeMitigationKnowledgeBaseVersion: PropTypes.bool,
  onDatasetsChange: PropTypes.func.isRequired,
  onRecipientsChange: PropTypes.func.isRequired,
  onMitigationKnowledgeBaseChange: PropTypes.func.isRequired,
  onUpgradeMitigationKnowledgeBaseVersionChange: PropTypes.func.isRequired,
  onSharedUsersChange: PropTypes.func.isRequired,
};

ProjectResourcesSection.defaultProps = {
  selectedMitigationKnowledgeBase: null,
  knowledgeBasesLoading: false,
  upgradeMitigationKnowledgeBaseVersion: false,
};
