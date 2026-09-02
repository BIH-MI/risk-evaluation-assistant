import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

export default function BeamSearchSection({
  search,
  errors,
  showErrors,
  onChange,
  searchType,
}) {
  const description =
    searchType === "AUTOMATIC"
      ? "These settings are used when Automatic search selection chooses Beam Search for a larger candidate set."
      : "Beam Search keeps only the highest-ranked candidate combinations at each search depth. A larger beam explores more alternatives but requires more computation.";

  return (
    <FormSection
      title="Beam Search"
      description={description}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Beam Width"
            type="number"
            value={search.beamWidth}
            onChange={(event) => onChange("beamWidth", event.target.value)}
            fullWidth
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.beamWidth)}
            helperText={
              showErrors && errors.beamWidth
                ? errors.beamWidth
                : "Maximum number of ranked candidate combinations retained for expansion at each search depth."
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Minimum Improvement"
            type="number"
            value={search.minImprovement}
            onChange={(event) =>
              onChange("minImprovement", event.target.value)
            }
            fullWidth
            inputProps={{ min: 0, step: "any" }}
            error={showErrors && Boolean(errors.minImprovement)}
            helperText={
              showErrors && errors.minImprovement
                ? errors.minImprovement
                : "Minimum increase in the best search signal considered meaningful between successive depths."
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Stagnation Depth Limit"
            type="number"
            value={search.stagnationDepthLimit}
            onChange={(event) =>
              onChange("stagnationDepthLimit", event.target.value)
            }
            fullWidth
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.stagnationDepthLimit)}
            helperText={
              showErrors && errors.stagnationDepthLimit
                ? errors.stagnationDepthLimit
                : "Number of consecutive search depths without sufficient improvement before Beam Search stops."
            }
          />
        </Grid>
      </Grid>
    </FormSection>
  );
}

BeamSearchSection.propTypes = {
  search: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  searchType: PropTypes.oneOf(["AUTOMATIC", "BEAM"]).isRequired,
};
