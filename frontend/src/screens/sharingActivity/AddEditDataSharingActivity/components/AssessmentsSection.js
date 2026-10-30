import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { useTranslation } from "react-i18next";

import RASelect from "components/input/RASelect";
import LabeledAvatar from "components/display/Tables/DataTable/CustomDataTableComponents/LabeledAvatar";
import ActivityFormSection, { avatarFieldSx } from "./ActivityFormSection";
import { assessmentsForResource } from "../activityFormModel";

/** Select of datasets, recipients or their assessments, each shown with its avatar. */
function AvatarSelect({ label, value, items, variant, onChange, disabled }) {
  const { t } = useTranslation();

  return (
    <RASelect
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={items.map((item) => ({
        value: String(item.id),
        label: <LabeledAvatar value={item.name} variant={variant} />,
      }))}
      helperText={!disabled && items.length === 0 ? t("dataSharingActivities.form.noAvailableOptions") : ""}
      required
      fullWidth
      disabled={disabled}
      sx={avatarFieldSx}
    />
  );
}

AvatarSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, name: PropTypes.string })).isRequired,
  variant: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

/**
 * The dataset and recipient of the activity, and one assessment of each. An assessment can only
 * be chosen once its dataset or recipient is selected, and only among that one's assessments.
 */
export default function AssessmentsSection({
  values,
  datasets,
  recipients,
  datasetAssessments,
  recipientAssessments,
  onDatasetChange,
  onRecipientChange,
  onDatasetAssessmentChange,
  onRecipientAssessmentChange,
  disabled,
}) {
  const { t } = useTranslation();

  return (
    <ActivityFormSection title={t("dataSharingActivities.form.assessmentsTitle")}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <AvatarSelect
            label={t("dataSharingActivities.form.datasetLabel")}
            value={values.datasetId}
            items={datasets}
            variant="dataset"
            onChange={onDatasetChange}
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AvatarSelect
            label={t("dataSharingActivities.form.datasetAssessmentLabel")}
            value={values.datasetAssessmentId}
            items={assessmentsForResource(datasetAssessments, "datasetId", values.datasetId)}
            variant="datasetAssessment"
            onChange={onDatasetAssessmentChange}
            disabled={disabled || !values.datasetId}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AvatarSelect
            label={t("dataSharingActivities.form.recipientLabel")}
            value={values.recipientId}
            items={recipients}
            variant="recipient"
            onChange={onRecipientChange}
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AvatarSelect
            label={t("dataSharingActivities.form.recipientAssessmentLabel")}
            value={values.recipientAssessmentId}
            items={assessmentsForResource(recipientAssessments, "recipientId", values.recipientId)}
            variant="recipientAssessment"
            onChange={onRecipientAssessmentChange}
            disabled={disabled || !values.recipientId}
          />
        </Grid>
      </Grid>
    </ActivityFormSection>
  );
}

AssessmentsSection.propTypes = {
  values: PropTypes.shape({
    datasetId: PropTypes.string.isRequired,
    recipientId: PropTypes.string.isRequired,
    datasetAssessmentId: PropTypes.string.isRequired,
    recipientAssessmentId: PropTypes.string.isRequired,
  }).isRequired,
  datasets: PropTypes.array.isRequired,
  recipients: PropTypes.array.isRequired,
  datasetAssessments: PropTypes.array.isRequired,
  recipientAssessments: PropTypes.array.isRequired,
  onDatasetChange: PropTypes.func.isRequired,
  onRecipientChange: PropTypes.func.isRequired,
  onDatasetAssessmentChange: PropTypes.func.isRequired,
  onRecipientAssessmentChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};
