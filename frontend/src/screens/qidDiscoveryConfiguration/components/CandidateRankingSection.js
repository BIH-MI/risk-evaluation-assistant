import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

const DESCRIPTIONS = Object.freeze({
  AUTOMATIC:
    "Ranking orders candidate combinations and, when Beam Search is selected, determines which candidates remain available for further expansion.",
  EXACT:
    "Ranking orders discovered combinations and influences which results are retained. It does not determine which combinations Exact Search evaluates.",
  BEAM:
    "Ranking determines which candidate combinations remain in the beam and therefore directly influences which search branches are explored.",
});

export default function CandidateRankingSection({
  search,
  errors,
  showErrors,
  onChange,
  searchType,
}) {
  return (
    <FormSection
      title="Candidate Ranking"
      description={DESCRIPTIONS[searchType] || DESCRIPTIONS.AUTOMATIC}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Distinction Weight"
            type="number"
            value={search.distinctionWeight}
            onChange={(event) =>
              onChange("distinctionWeight", event.target.value)
            }
            fullWidth
            inputProps={{ min: 0, step: "any" }}
            error={showErrors && Boolean(errors.distinctionWeight)}
            helperText={
              showErrors && errors.distinctionWeight
                ? errors.distinctionWeight
                : "Relative contribution of Distinction to the candidate ranking score."
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Separation Weight"
            type="number"
            value={search.separationWeight}
            onChange={(event) =>
              onChange("separationWeight", event.target.value)
            }
            fullWidth
            inputProps={{ min: 0, step: "any" }}
            error={showErrors && Boolean(errors.separationWeight)}
            helperText={
              showErrors && errors.separationWeight
                ? errors.separationWeight
                : "Relative contribution of Separation to the candidate ranking score."
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label="Attribute Count Penalty"
            type="number"
            value={search.attributeCountPenalty}
            onChange={(event) =>
              onChange("attributeCountPenalty", event.target.value)
            }
            fullWidth
            inputProps={{ min: 0, step: "any" }}
            error={showErrors && Boolean(errors.attributeCountPenalty)}
            helperText={
              showErrors && errors.attributeCountPenalty
                ? errors.attributeCountPenalty
                : "Penalty applied to larger combinations so smaller combinations are preferred when otherwise similarly ranked."
            }
          />
        </Grid>
      </Grid>
    </FormSection>
  );
}

CandidateRankingSection.propTypes = {
  search: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  searchType: PropTypes.oneOf(["AUTOMATIC", "EXACT", "BEAM"]).isRequired,
};
