import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

const DESCRIPTION_KEYS = Object.freeze({
  AUTOMATIC: "qidDiscoveryConfiguration.candidateRanking.automaticDescription",
  EXACT: "qidDiscoveryConfiguration.candidateRanking.exactDescription",
  BEAM: "qidDiscoveryConfiguration.candidateRanking.beamDescription",
});

export default function CandidateRankingSection({
  search,
  errors,
  showErrors,
  onChange,
  searchType,
}) {
  const { t } = useTranslation();

  return (
    <FormSection
      title={t("qidDiscoveryConfiguration.candidateRanking.title")}
      description={t(
        DESCRIPTION_KEYS[searchType] || DESCRIPTION_KEYS.AUTOMATIC
      )}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.distinctionWeight")}
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
                : t(
                    "qidDiscoveryConfiguration.candidateRanking.distinctionWeightHelper"
                  )
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.separationWeight")}
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
                : t(
                    "qidDiscoveryConfiguration.candidateRanking.separationWeightHelper"
                  )
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.attributeCountPenalty")}
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
                : t(
                    "qidDiscoveryConfiguration.candidateRanking.attributeCountPenaltyHelper"
                  )
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
