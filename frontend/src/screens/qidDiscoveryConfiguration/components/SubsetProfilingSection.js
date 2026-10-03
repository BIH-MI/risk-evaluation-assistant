import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

export default function SubsetProfilingSection({
  profiling,
  errors,
  showErrors,
  onChange,
}) {
  const { t } = useTranslation();

  return (
    <FormSection title={t("qidDiscoveryConfiguration.subsetProfiling.title")}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RAInput
            type="number"
            label={t("qidDiscoveryConfiguration.fields.maxSubsetSize")}
            value={profiling.maxSubsetSize}
            onChange={(event) => onChange("maxSubsetSize", event.target.value)}
            fullWidth
            required
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.maxSubsetSize)}
            helperText={
              showErrors && errors.maxSubsetSize
                ? errors.maxSubsetSize
                : t(
                    "qidDiscoveryConfiguration.subsetProfiling.maxSubsetSizeHelper"
                  )
            }
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RAInput
            type="number"
            label={t("qidDiscoveryConfiguration.fields.maxEvaluatedSubsets")}
            value={profiling.maxEvaluatedSubsets}
            onChange={(event) =>
              onChange("maxEvaluatedSubsets", event.target.value)
            }
            fullWidth
            required
            inputProps={{ min: 1, step: 1 }}
            error={showErrors && Boolean(errors.maxEvaluatedSubsets)}
            helperText={
              showErrors && errors.maxEvaluatedSubsets
                ? errors.maxEvaluatedSubsets
                : t(
                    "qidDiscoveryConfiguration.subsetProfiling.maxEvaluatedSubsetsHelper"
                  )
            }
          />
        </Grid>
      </Grid>
    </FormSection>
  );
}

SubsetProfilingSection.propTypes = {
  profiling: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
