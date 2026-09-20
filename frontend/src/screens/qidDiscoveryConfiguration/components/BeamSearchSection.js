import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "components/layout/FormSection";

export default function BeamSearchSection({
  search,
  errors,
  showErrors,
  onChange,
  searchType,
}) {
  const { t } = useTranslation();
  const description = t(
    searchType === "AUTOMATIC"
      ? "qidDiscoveryConfiguration.beamSearch.automaticDescription"
      : "qidDiscoveryConfiguration.beamSearch.beamDescription"
  );

  return (
    <FormSection
      title={t("qidDiscoveryConfiguration.beamSearch.title")}
      description={description}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.beamWidth")}
            type="number"
            value={search.beamWidth}
            onChange={(event) => onChange("beamWidth", event.target.value)}
            fullWidth
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.beamWidth)}
            helperText={
              showErrors && errors.beamWidth
                ? errors.beamWidth
                : t("qidDiscoveryConfiguration.beamSearch.beamWidthHelper")
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.minImprovement")}
            type="number"
            value={search.minImprovement}
            onChange={(event) => onChange("minImprovement", event.target.value)}
            fullWidth
            inputProps={{ min: 0, step: "any" }}
            error={showErrors && Boolean(errors.minImprovement)}
            helperText={
              showErrors && errors.minImprovement
                ? errors.minImprovement
                : t("qidDiscoveryConfiguration.beamSearch.minImprovementHelper")
            }
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.stagnationDepthLimit")}
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
                : t(
                    "qidDiscoveryConfiguration.beamSearch.stagnationDepthLimitHelper"
                  )
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
