import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { FormControlLabel, Grid, Switch } from "@mui/material";

import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import FormSection from "components/layout/FormSection";

export default function ConfigurationDetailsSection({
  form,
  errors,
  showErrors,
  onChange,
}) {
  const { t } = useTranslation();

  return (
    <FormSection
      title={t("qidDiscoveryConfiguration.configurationDetails.title")}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.name")}
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            fullWidth
            required
            error={showErrors && Boolean(errors.name)}
            helperText={showErrors ? errors.name : ""}
          />
        </Grid>
        <Grid item xs={12}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.description")}
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.version")}
            value={form.versionNumber}
            disabled
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(event) => onChange("active", event.target.checked)}
              />
            }
            label={t("qidDiscoveryConfiguration.fields.active")}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={
              <Switch
                checked={form.defaultConfiguration}
                onChange={(event) =>
                  onChange("defaultConfiguration", event.target.checked)
                }
              />
            }
            label={t("qidDiscoveryConfiguration.fields.default")}
          />
          {showErrors && errors.defaultConfiguration && (
            <RATypography variant="caption" color="error" display="block">
              {errors.defaultConfiguration}
            </RATypography>
          )}
        </Grid>
      </Grid>
    </FormSection>
  );
}

ConfigurationDetailsSection.propTypes = {
  form: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
