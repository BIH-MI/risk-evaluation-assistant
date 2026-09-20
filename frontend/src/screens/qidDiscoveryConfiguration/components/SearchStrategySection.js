import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid, MenuItem } from "@mui/material";

import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import FormSection from "components/layout/FormSection";
import { QID_SEARCH_TYPE_OPTIONS } from "../qidDiscoveryConfigurationUtils";

const SEARCH_TYPE_DESCRIPTION_KEYS = Object.freeze({
  AUTOMATIC: "qidDiscoveryConfiguration.searchStrategy.automaticDescription",
  EXACT: "qidDiscoveryConfiguration.searchStrategy.exactDescription",
  BEAM: "qidDiscoveryConfiguration.searchStrategy.beamDescription",
});

export default function SearchStrategySection({
  search,
  errors,
  showErrors,
  onChange,
}) {
  const { t } = useTranslation();
  const isAutomatic = search.searchType === "AUTOMATIC";
  const searchTypeDescriptionKey =
    SEARCH_TYPE_DESCRIPTION_KEYS[search.searchType];
  const searchTypeDescription = searchTypeDescriptionKey
    ? t(searchTypeDescriptionKey)
    : "";

  return (
    <FormSection title={t("qidDiscoveryConfiguration.searchStrategy.title")}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RAInput
            select
            label={t("qidDiscoveryConfiguration.fields.searchType")}
            value={search.searchType}
            onChange={(event) => onChange("searchType", event.target.value)}
            fullWidth
            error={showErrors && Boolean(errors.searchType)}
            helperText={showErrors ? errors.searchType : ""}
          >
            {QID_SEARCH_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.translationKey)}
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
              label={t(
                "qidDiscoveryConfiguration.fields.exactSearchMaxCandidateCount"
              )}
              type="number"
              value={search.exactSearchMaxCandidateCount}
              onChange={(event) =>
                onChange("exactSearchMaxCandidateCount", event.target.value)
              }
              fullWidth
              inputProps={{ min: 1, step: 1 }}
              error={showErrors && Boolean(errors.exactSearchMaxCandidateCount)}
              helperText={
                showErrors && errors.exactSearchMaxCandidateCount
                  ? errors.exactSearchMaxCandidateCount
                  : t(
                      "qidDiscoveryConfiguration.searchStrategy.exactSearchMaxCandidateCountHelper"
                    )
              }
            />
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <RAInput
            label={t("qidDiscoveryConfiguration.fields.maxCombinationSize")}
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
                : t(
                    "qidDiscoveryConfiguration.searchStrategy.maxCombinationSizeHelper"
                  )
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
