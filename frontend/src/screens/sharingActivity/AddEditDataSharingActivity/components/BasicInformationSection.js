import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import ActivityFormSection from "./ActivityFormSection";

export default function BasicInformationSection({ name, description, onChange, disabled, children }) {
  const { t } = useTranslation();

  return (
    <ActivityFormSection title={t("dataSharingActivities.form.basicInformationTitle")}>
      <OnBlurRAInput
        label={t("dataSharingActivities.form.activityNameLabel")}
        value={name}
        onCommit={(value) => onChange("name", value)}
        fullWidth
        required
        disabled={disabled}
        // RAInput's disabled only blocks the mouse; readOnly also blocks typing.
        inputProps={{ readOnly: disabled }}
      />
      <OnBlurRAInput
        label={t("dataSharingActivities.form.descriptionLabel")}
        value={description}
        onCommit={(value) => onChange("description", value)}
        fullWidth
        multiline
        rows={3}
        disabled={disabled}
        inputProps={{ readOnly: disabled }}
      />
      {children}
    </ActivityFormSection>
  );
}

BasicInformationSection.propTypes = {
  children: PropTypes.node,
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};
