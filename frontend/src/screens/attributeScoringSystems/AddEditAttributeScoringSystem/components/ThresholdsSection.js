import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import { formatScoreRange } from "utils/AttributeScale";

export default function ThresholdsSection({
  form,
  errors,
  showErrors,
  ranges,
  onChange,
}) {
  return (
    <RABox>
      <RATypography variant="h6" mb={1}>
        Thresholds
      </RATypography>
      <RATypography variant="caption" color="text" display="block" mb={2}>
        Attainable identifiability range:{" "}
        {formatScoreRange(ranges.identifiability)}. Attainable sensitivity
        range: {formatScoreRange(ranges.sensitivity)}.
      </RATypography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RAInput
            label="Default identifiability threshold"
            type="number"
            value={form.defaultIdentifiabilityThreshold}
            onChange={(event) =>
              onChange("defaultIdentifiabilityThreshold", event.target.value)
            }
            inputProps={{
              min: ranges.identifiability.min,
              max: ranges.identifiability.max,
              step: "any",
            }}
            fullWidth
            error={showErrors && Boolean(errors.identifiability)}
            helperText={showErrors ? errors.identifiability : ""}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RAInput
            label="Default sensitivity threshold"
            type="number"
            value={form.defaultSensitivityThreshold}
            onChange={(event) =>
              onChange("defaultSensitivityThreshold", event.target.value)
            }
            inputProps={{
              min: ranges.sensitivity.min,
              max: ranges.sensitivity.max,
              step: "any",
            }}
            fullWidth
            error={showErrors && Boolean(errors.sensitivity)}
            helperText={showErrors ? errors.sensitivity : ""}
          />
        </Grid>
      </Grid>
    </RABox>
  );
}

ThresholdsSection.propTypes = {
  form: PropTypes.shape({
    defaultIdentifiabilityThreshold: PropTypes.string.isRequired,
    defaultSensitivityThreshold: PropTypes.string.isRequired,
  }).isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  ranges: PropTypes.shape({
    identifiability: PropTypes.shape({
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired,
    }).isRequired,
    sensitivity: PropTypes.shape({
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};
