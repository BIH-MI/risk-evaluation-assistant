import React from "react";
import PropTypes from "prop-types";
import { Grid, MenuItem } from "@mui/material";

import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import FormSection from "./FormSection";
import { QID_SEARCH_TYPE_OPTIONS } from "../qidDiscoveryConfigurationUtils";

const SEARCH_TYPE_DESCRIPTIONS = Object.freeze({
  AUTOMATIC:
    "REA automatically selects the search strategy based on the number of eligible candidate attributes. Exact Level-Wise Search is used up to the configured candidate limit; larger candidate sets use Beam Search.",
  EXACT:
    "Exact Level-Wise Search systematically explores eligible attribute combinations up to the configured maximum combination size. It provides more complete exploration but can become computationally expensive for large candidate sets.",
  BEAM:
    "Beam Search uses a heuristic search that retains only the highest-ranked candidate combinations at each depth. It is more scalable for large candidate sets but does not evaluate every possible combination.",
});

export default function SearchStrategySection({
  search,
  errors,
  showErrors,
  onChange,
}) {
  const isAutomatic = search.searchType === "AUTOMATIC";
  const searchTypeDescription =
    SEARCH_TYPE_DESCRIPTIONS[search.searchType] || "";

  return (
    <FormSection title="Search Strategy">
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RAInput
            select
            label="QID Search Type"
            value={search.searchType}
            onChange={(event) => onChange("searchType", event.target.value)}
            fullWidth
            error={showErrors && Boolean(errors.searchType)}
            helperText={showErrors ? errors.searchType : ""}
          >
            {QID_SEARCH_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RAInput>
        </Grid>
        {searchTypeDescription && (
          <Grid item xs={12}>
            <RATypography
              variant="body2"
              display="block"
              maxWidth={800}
              sx={{ color: "text.secondary" }}
            >
              {searchTypeDescription}
            </RATypography>
          </Grid>
        )}
        {isAutomatic && (
          <Grid item xs={12} md={6}>
            <RAInput
              label="Exact Search Maximum Candidate Count"
              type="number"
              value={search.exactSearchMaxCandidateCount}
              onChange={(event) =>
                onChange("exactSearchMaxCandidateCount", event.target.value)
              }
              fullWidth
              inputProps={{ min: 1, step: 1 }}
              error={
                showErrors && Boolean(errors.exactSearchMaxCandidateCount)
              }
              helperText={
                showErrors && errors.exactSearchMaxCandidateCount
                  ? errors.exactSearchMaxCandidateCount
                  : "Maximum number of eligible candidate attributes for Exact Level-Wise Search in Automatic mode."
              }
            />
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <RAInput
            label="Maximum Combination Size"
            type="number"
            value={search.maxCombinationSize}
            onChange={(event) =>
              onChange("maxCombinationSize", event.target.value)
            }
            fullWidth
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.maxCombinationSize)}
            helperText={
              showErrors && errors.maxCombinationSize
                ? errors.maxCombinationSize
                : "Maximum number of attributes allowed in a searched QID combination."
            }
          />
        </Grid>
      </Grid>
    </FormSection>
  );
}

SearchStrategySection.propTypes = {
  search: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
