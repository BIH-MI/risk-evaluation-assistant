import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid } from "@mui/material";

import RAInput from "components/input/RAInput";
import FormSection from "./FormSection";

export default function ResultRetentionSection({
  search,
  errors,
  showErrors,
  onChange,
}) {
  const { t } = useTranslation();

  return (
    <FormSection
      title={t("qidDiscoveryConfiguration.resultRetention.title")}
      description={t("qidDiscoveryConfiguration.resultRetention.description")}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RAInput
            label={t(
              "qidDiscoveryConfiguration.fields.maxPersistedCombinations"
            )}
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
                : t(
                    "qidDiscoveryConfiguration.resultRetention.maxPersistedCombinationsHelper"
                  )
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
