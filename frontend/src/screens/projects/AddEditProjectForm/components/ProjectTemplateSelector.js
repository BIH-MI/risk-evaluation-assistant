import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RAAlert from "components/feedback/RAAlert";
import RAInput from "components/input/RAInput";
import RASelect from "components/input/RASelect";
import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

export default function ProjectTemplateSelector({
  isEdit,
  currentProject,
  templates,
  templatesLoading,
  value,
  error,
  showErrors,
  disabled,
  onChange,
}) {
  const { t } = useTranslation();

  if (isEdit) {
    return (
      <RABox display="flex" flexDirection="column" gap={1}>
        <RAInput
          label={t("projects.form.templateLabel")}
          value={
            currentProject?.templateName
              ? `${currentProject.templateName} (v${currentProject.templateVersionNumber})`
              : ""
          }
          disabled
          fullWidth
        />
        {currentProject?.newerTemplateVersionAvailable && (
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              {t("projects.form.newerTemplateVersionNotice")}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    );
  }

  const options = templates.map((template) => ({
    value: template.versionId,
    label: template.name,
  }));

  return (
    <RABox display="flex" flexDirection="column" gap={1}>
      <RASelect
        label={t("projects.form.templateLabel")}
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value))}
        options={options}
        fullWidth
        required
        disabled={disabled || templatesLoading}
        error={showErrors && Boolean(error)}
        helperText={
          showErrors && error ? error : t("projects.form.templateHelper")
        }
      />
      {!templatesLoading && options.length === 0 && (
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            {t("projects.form.noTemplatesAvailable")}
          </RATypography>
        </RAAlert>
      )}
    </RABox>
  );
}

ProjectTemplateSelector.propTypes = {
  isEdit: PropTypes.bool.isRequired,
  currentProject: PropTypes.object,
  templates: PropTypes.array.isRequired,
  templatesLoading: PropTypes.bool.isRequired,
  value: PropTypes.number,
  error: PropTypes.string,
  showErrors: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

ProjectTemplateSelector.defaultProps = {
  currentProject: null,
  value: null,
  error: "",
};
