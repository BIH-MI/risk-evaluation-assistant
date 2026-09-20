import React from "react";
import PropTypes from "prop-types";
import { Autocomplete, Paper, TextField } from "@mui/material";
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

export default function ProjectResourcesSection({
  datasets,
  recipients,
  selectedDatasets,
  selectedRecipients,
  sharedUsers,
  disabled,
  onDatasetsChange,
  onRecipientsChange,
  onSharedUsersChange,
}) {
  const { t } = useTranslation();

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
  selectedDatasets: PropTypes.array.isRequired,
  selectedRecipients: PropTypes.array.isRequired,
  sharedUsers: PropTypes.array.isRequired,
  disabled: PropTypes.bool.isRequired,
  onDatasetsChange: PropTypes.func.isRequired,
  onRecipientsChange: PropTypes.func.isRequired,
  onSharedUsersChange: PropTypes.func.isRequired,
};
