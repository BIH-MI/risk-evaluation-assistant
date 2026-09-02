import React from "react";
import PropTypes from "prop-types";
import { FormControlLabel, Grid, Switch } from "@mui/material";

import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import FormSection from "./FormSection";

export default function ConfigurationDetailsSection({
  form,
  errors,
  showErrors,
  onChange,
}) {
  return (
    <FormSection title="Configuration Details">
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RAInput
            label="Name"
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
            label="Description"
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Version"
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
            label="Active"
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
            label="Default"
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
