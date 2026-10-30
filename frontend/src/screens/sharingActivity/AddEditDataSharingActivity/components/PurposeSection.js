import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { useTranslation } from "react-i18next";

import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import ActivityFormSection from "./ActivityFormSection";
import { RequirementInput, RequirementSelect } from "./RequirementFields";

/** Why and how the data is shared, and the data the analysis needs. */
export default function PurposeSection({ values, errors, onChange, disabled }) {
  const { t } = useTranslation();
  const fieldProps = (requirement) => ({
    requirement,
    value: values[requirement],
    error: errors[requirement],
    onChange,
    disabled,
  });

  return (
    <ActivityFormSection title={t("dataSharingActivities.form.purposeTitle")}>
      <OnBlurRAInput
        label={t("dataSharingActivities.form.sharingPurposeLabel")}
        value={values.sharingPurpose}
        onCommit={(value) => onChange("sharingPurpose", value)}
        inputProps={{ maxLength: 4000, readOnly: disabled }}
        fullWidth
        multiline
        minRows={3}
        disabled={disabled}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RequirementSelect {...fieldProps("sharingArrangement")} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RequirementSelect {...fieldProps("requiredExternalDeliverables")} multiple />
        </Grid>
        <Grid item xs={12} md={6}>
          <RequirementSelect {...fieldProps("analysisDataNeeded")} multiple />
        </Grid>
        <Grid item xs={12} md={6}>
          <RequirementSelect {...fieldProps("requiredTemporalResolution")} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RequirementInput
            {...fieldProps("minimumCohortRetentionPercent")}
            type="number"
            inputProps={{ min: 0, max: 100, step: "any" }}
            unit="%"
          />
        </Grid>
      </Grid>
    </ActivityFormSection>
  );
}

PurposeSection.propTypes = {
  values: PropTypes.shape({
    sharingPurpose: PropTypes.string.isRequired,
    sharingArrangement: PropTypes.string.isRequired,
    requiredExternalDeliverables: PropTypes.arrayOf(PropTypes.string).isRequired,
    analysisDataNeeded: PropTypes.arrayOf(PropTypes.string).isRequired,
    requiredTemporalResolution: PropTypes.string.isRequired,
    minimumCohortRetentionPercent: PropTypes.string.isRequired,
  }).isRequired,
  errors: PropTypes.objectOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};
