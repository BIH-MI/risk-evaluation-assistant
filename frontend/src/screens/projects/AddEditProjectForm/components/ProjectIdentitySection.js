import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";

export default function ProjectIdentitySection({ values, disabled, onFieldChange }) {
  const { t } = useTranslation();

  return (
    <>
      <OnBlurRAInput
        label={t("projects.form.nameLabel")}
        value={values.name}
        onCommit={(value) => onFieldChange("name", value)}
        required
        fullWidth
        disabled={disabled}
      />

      <OnBlurRAInput
        label={t("projects.form.descriptionLabel")}
        value={values.description}
        onCommit={(value) => onFieldChange("description", value)}
        fullWidth
        multiline
        rows={2}
        disabled={disabled}
      />
    </>
  );
}

ProjectIdentitySection.propTypes = {
  values: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onFieldChange: PropTypes.func.isRequired,
};
