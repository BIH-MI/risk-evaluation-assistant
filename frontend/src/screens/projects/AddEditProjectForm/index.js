import React from "react";
import { useTranslation } from "react-i18next";

import RATypography from "components/display/RATypography";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";

import ProjectIdentitySection from "./components/ProjectIdentitySection";
import ProjectRequirementSections from "./components/ProjectRequirementSections";
import ProjectResourcesSection from "./components/ProjectResourcesSection";
import ProjectTemplateSelector from "./components/ProjectTemplateSelector";
import useProjectForm from "./useProjectForm";

export default function AddEditProjectForm() {
  const { t } = useTranslation();
  const {
    isEdit,
    values,
    sharedUsers,
    templates,
    templatesLoading,
    templateSections,
    datasets,
    recipients,
    selectedDatasets,
    selectedRecipients,
    projectStatus,
    currentProject,
    submitError,
    setSubmitError,
    lockError,
    setLockError,
    isSubmitting,
    isReadOnly,
    showErrors,
    validationErrors,
    handleFieldChange,
    handleTemplateChange,
    handleResponseChange,
    handleSharedUsersChange,
    handleDatasetsChange,
    handleRecipientsChange,
    handleSubmit,
  } = useProjectForm();

  return (
    <>
      <RABox
        py={8}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: 980,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <RATypography variant="h5" textAlign="center">
          {isEdit ? t("projects.form.editTitle") : t("projects.form.createTitle")}
        </RATypography>

        <ProjectIdentitySection
          values={values}
          disabled={isReadOnly}
          onFieldChange={handleFieldChange}
        />

        <ProjectTemplateSelector
          isEdit={isEdit}
          currentProject={currentProject}
          templates={templates}
          templatesLoading={templatesLoading}
          value={values.templateVersionId}
          error={validationErrors.template}
          showErrors={showErrors}
          disabled={isReadOnly}
          onChange={handleTemplateChange}
        />

        <ProjectResourcesSection
          datasets={datasets}
          recipients={recipients}
          selectedDatasets={selectedDatasets}
          selectedRecipients={selectedRecipients}
          sharedUsers={sharedUsers}
          disabled={isReadOnly}
          onDatasetsChange={handleDatasetsChange}
          onRecipientsChange={handleRecipientsChange}
          onSharedUsersChange={handleSharedUsersChange}
        />

        <ProjectRequirementSections
          sections={templateSections}
          responses={values.responses}
          errors={validationErrors.responses}
          showErrors={showErrors}
          disabled={isReadOnly}
          onChangeResponse={handleResponseChange}
        />

        <RAButton
          type="submit"
          sx={{ alignSelf: "center", mt: 1 }}
          disabled={isReadOnly || (isEdit && projectStatus === "loading")}
        >
          {isSubmitting
            ? t("projects.form.saving")
            : isEdit
            ? t("projects.form.saveChanges")
            : t("projects.form.createProject")}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "lockError",
            color: "error",
            message: lockError,
            onClose: () => setLockError(null),
          },
          {
            id: "submitError",
            color: "error",
            message: submitError,
            onClose: () => setSubmitError(""),
          },
        ]}
      />
    </>
  );
}
