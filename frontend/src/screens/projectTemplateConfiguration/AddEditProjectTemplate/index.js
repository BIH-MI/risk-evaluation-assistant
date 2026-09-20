import React from "react";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";

import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";

import TemplateIdentitySection from "./components/TemplateIdentitySection";
import TemplateSectionsEditor from "./components/TemplateSectionsEditor";
import useProjectTemplateForm from "./useProjectTemplateForm";

export default function AddEditProjectTemplate() {
  const { t } = useTranslation();
  const {
    isAdmin,
    isEditMode,
    form,
    loading,
    saving,
    errorMessage,
    validationErrors,
    showErrors,
    updateField,
    updateSection,
    addSection,
    removeSection,
    moveSection,
    updateRequirement,
    addRequirement,
    removeRequirement,
    handleSubmit,
    handleFormKeyDown,
    clearError,
  } = useProjectTemplateForm();

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            {t("projectTemplateConfiguration.alerts.adminOnly")}
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  if (loading) {
    return (
      <RABox p={5} display="flex" justifyContent="center">
        <CircularProgress size={60} thickness={4} color="primary" disableShrink />
      </RABox>
    );
  }

  return (
    <RABox
      component="form"
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      display="flex"
      flexDirection="column"
      maxWidth="1000px"
      width="100%"
      mx="auto"
      gap={3}
      p={2}
    >
      <RATypography variant="h4" fontWeight="bold" align="center">
        {isEditMode
          ? t("projectTemplateConfiguration.form.editTitle")
          : t("projectTemplateConfiguration.form.createTitle")}
      </RATypography>

      <TemplateIdentitySection
        form={form}
        errors={validationErrors.fields}
        showErrors={showErrors}
        onChange={updateField}
      />

      {showErrors && validationErrors.fields.coreStructure && (
        <RAAlert color="error">
          <RATypography variant="body2" color="white">
            {validationErrors.fields.coreStructure}
          </RATypography>
        </RAAlert>
      )}

      {showErrors && validationErrors.fields.coreRequirements && (
        <RAAlert color="error">
          <RATypography variant="body2" color="white">
            {validationErrors.fields.coreRequirements}
          </RATypography>
        </RAAlert>
      )}

      <TemplateSectionsEditor
        sections={form.sections}
        errors={validationErrors.sections}
        showErrors={showErrors}
        onUpdateSection={updateSection}
        onAddSection={addSection}
        onRemoveSection={removeSection}
        onMoveSection={moveSection}
        onUpdateRequirement={updateRequirement}
        onAddRequirement={addRequirement}
        onRemoveRequirement={removeRequirement}
      />

      <RABox display="flex" justifyContent="center" mt={2}>
        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={saving}
          sx={{ minWidth: 160 }}
        >
          {saving ? t("projectTemplateConfiguration.form.saving") : t("projectTemplateConfiguration.form.save")}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "errorMsg",
            color: "error",
            message: errorMessage,
            onClose: clearError,
          },
        ]}
      />
    </RABox>
  );
}
