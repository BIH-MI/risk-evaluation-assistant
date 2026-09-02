import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

export default function ResultRetentionSection({
  search,
  errors,
  showErrors,
  onChange,
}) {
  return (
    <FormSection
      title="Result Retention"
      description="Controls how many of the discovered aggregate QID combinations are kept after the search completes."
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RAInput
            label="Maximum Retained Combinations"
            type="number"
            value={search.maxPersistedCombinations}
            onChange={(event) =>
              onChange("maxPersistedCombinations", event.target.value)
            }
            fullWidth
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.maxPersistedCombinations)}
            helperText={
              showErrors && errors.maxPersistedCombinations
                ? errors.maxPersistedCombinations
                : "Maximum number of aggregate QID combination results retained after discovery. This does not limit how many combinations may be evaluated during the search."
            }
          />
        </Grid>
      </Grid>
    </FormSection>
  );
}

ResultRetentionSection.propTypes = {
  search: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
