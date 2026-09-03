import React from "react";
import PropTypes from "prop-types";
import { MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAInput from "components/input/RAInput";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";

function AssessmentDetailsSection({
  recipientId,
  configurationId,
  name,
  description,
  recipients,
  configurationOptions,
  isEditMode,
  isReadOnly,
  onRecipientChange,
  onConfigurationChange,
  onNameChange,
  onDescriptionChange,
}) {
  const { t } = useTranslation();

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      <RAInput
        select
        label={t("recipientAssessments.form.recipientLabel")}
        value={recipientId}
        onChange={(event) => onRecipientChange(event.target.value)}
        fullWidth
        required
        disabled={isReadOnly || isEditMode}
      >
        {recipients.map((recipient) => (
          <MenuItem key={recipient.id} value={recipient.id}>
            {recipient.organization || recipient.name}
          </MenuItem>
        ))}
      </RAInput>

      <RAInput
        select
        label={t("recipientAssessments.form.configurationLabel")}
        value={configurationId}
        onChange={(event) => onConfigurationChange(event.target.value)}
        fullWidth
        required
        disabled={isReadOnly || isEditMode}
      >
        {configurationOptions.map((configuration) => (
          <MenuItem key={configuration.id} value={configuration.id}>
            <RABox display="flex" flexDirection="column">
              <RATypography variant="button" fontWeight="medium">
                {configuration.name} v
                {configuration.version || configuration.currentVersion || 1}
              </RATypography>
              {configuration.description && (
                <RATypography variant="caption" color="secondary">
                  {configuration.description}
                </RATypography>
              )}
            </RABox>
          </MenuItem>
        ))}
      </RAInput>

      <OnBlurRAInput
        label={t("recipientAssessments.form.assessmentNameLabel")}
        value={name}
        onCommit={onNameChange}
        fullWidth
        required
        disabled={isReadOnly}
      />
      <OnBlurRAInput
        label={t("recipientAssessments.form.descriptionLabel")}
        value={description}
        onCommit={onDescriptionChange}
        fullWidth
        multiline
        minRows={3}
        disabled={isReadOnly}
      />
    </RABox>
  );
}

AssessmentDetailsSection.propTypes = {
  recipientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  configurationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string,
  description: PropTypes.string,
  recipients: PropTypes.arrayOf(PropTypes.object).isRequired,
  configurationOptions: PropTypes.arrayOf(PropTypes.object).isRequired,
  isEditMode: PropTypes.bool.isRequired,
  isReadOnly: PropTypes.bool.isRequired,
  onRecipientChange: PropTypes.func.isRequired,
  onConfigurationChange: PropTypes.func.isRequired,
  onNameChange: PropTypes.func.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
};

AssessmentDetailsSection.defaultProps = {
  recipientId: "",
  configurationId: "",
  name: "",
  description: "",
};

export default AssessmentDetailsSection;
