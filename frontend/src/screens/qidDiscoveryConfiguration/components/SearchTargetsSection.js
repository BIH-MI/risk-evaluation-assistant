import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "components/layout/FormSection";

export default function SearchTargetsSection({
  search,
  errors,
  showErrors,
  onChange,
}) {
  const { t } = useTranslation();

  return (
    <FormSection
      title={t("qidDiscoveryConfiguration.searchTargets.title")}
      description={t("qidDiscoveryConfiguration.searchTargets.description")}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.targetDistinction")}
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
                : t(
                    "qidDiscoveryConfiguration.searchTargets.targetDistinctionHelper"
                  )
            }
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.targetSeparation")}
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
                : t(
                    "qidDiscoveryConfiguration.searchTargets.targetSeparationHelper"
                  )
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
