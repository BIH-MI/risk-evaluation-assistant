import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { useTranslation } from "react-i18next";

import ActivityFormSection from "./ActivityFormSection";
import { RequirementInput, RequirementSelect } from "./RequirementFields";

/** Setup-time and budget limits that mitigation plans are checked against. */
export default function AdministrativeRequirementsSection({ values, errors, onChange, disabled }) {
  const { t } = useTranslation();
  const fieldProps = (requirement) => ({
    requirement,
    value: values[requirement],
    error: errors[requirement],
    onChange,
    disabled,
  });

  return (
    <ActivityFormSection title={t("dataSharingActivities.form.requirementsTitle")}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <RequirementInput
            {...fieldProps("maximumSetupTimeDays")}
            type="number"
            inputProps={{ min: 0, step: 1 }}
            unit={t("dataSharingActivities.form.daysUnit")}
          />
        </Grid>
        <Grid item xs={8} md={5}>
          <RequirementInput
            {...fieldProps("availableBudget")}
            type="number"
            inputProps={{ min: 0, step: "any" }}
          />
        </Grid>
        <Grid item xs={4} md={3}>
          <RequirementSelect {...fieldProps("budgetCurrency")} />
        </Grid>
      </Grid>
    </ActivityFormSection>
  );
}

AdministrativeRequirementsSection.propTypes = {
  values: PropTypes.shape({
    maximumSetupTimeDays: PropTypes.string.isRequired,
    availableBudget: PropTypes.string.isRequired,
    budgetCurrency: PropTypes.string.isRequired,
  }).isRequired,
  errors: PropTypes.objectOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};
