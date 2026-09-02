import React from "react";
import PropTypes from "prop-types";
import { FormControlLabel, Grid, Switch } from "@mui/material";

import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";

export default function ConfigurationDetailsSection({
  form,
  errors,
  showErrors,
  onChange,
}) {
  return (
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
          minRows={3}
        />
      </Grid>
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
        <FormControlLabel
          control={
            <Switch
              checked={form.defaultSystem}
              onChange={(event) =>
                onChange("defaultSystem", event.target.checked)
              }
            />
          }
          label="Default"
        />
        {showErrors && errors.defaultSystem && (
          <RATypography variant="caption" color="error">
            {errors.defaultSystem}
          </RATypography>
        )}
      </Grid>
    </Grid>
  );
}

ConfigurationDetailsSection.propTypes = {
  form: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    active: PropTypes.bool.isRequired,
    defaultSystem: PropTypes.bool.isRequired,
  }).isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
