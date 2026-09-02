import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

const DESCRIPTION =
  "Search targets determine when an already strong candidate no longer needs to be expanded into larger combinations. Both targets must be reached. These are search-control values, not Distinguishability assessment thresholds.";

export default function SearchTargetsSection({
  search,
  errors,
  showErrors,
  onChange,
}) {
  return (
    <FormSection title="Search Targets" description={DESCRIPTION}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RAInput
            label="Target Distinction"
            type="number"
            value={search.targetDistinction}
            onChange={(event) =>
              onChange("targetDistinction", event.target.value)
            }
            fullWidth
            inputProps={{ min: 0, max: 1, step: "any" }}
            error={showErrors && Boolean(errors.targetDistinction)}
            helperText={
              showErrors && errors.targetDistinction
                ? errors.targetDistinction
                : "Minimum Distinction target used when deciding whether a candidate should be expanded further."
            }
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RAInput
            label="Target Separation"
            type="number"
            value={search.targetSeparation}
            onChange={(event) =>
              onChange("targetSeparation", event.target.value)
            }
            fullWidth
            inputProps={{ min: 0, max: 1, step: "any" }}
            error={showErrors && Boolean(errors.targetSeparation)}
            helperText={
              showErrors && errors.targetSeparation
                ? errors.targetSeparation
                : "Minimum Separation target used together with Target Distinction when deciding whether a candidate should be expanded further."
            }
          />
        </Grid>
      </Grid>
    </FormSection>
  );
}

SearchTargetsSection.propTypes = {
  search: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  searchType: PropTypes.oneOf(["AUTOMATIC", "EXACT", "BEAM"]).isRequired,
};
