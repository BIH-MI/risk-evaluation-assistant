import React from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import AssessmentDetailsSection from "./components/AssessmentDetailsSection";
import QuestionnaireSection from "./components/QuestionnaireSection";
import useRecipientAssessmentForm from "./useRecipientAssessmentForm";

function FloatingAssessmentAlert({ message, onClose }) {
  const theme = useTheme();

  if (!message) return null;

  return (
    <RABox
      sx={{
        position: "fixed",
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        width: 300,
        zIndex: theme.zIndex.snackbar,
      }}
    >
      <RAAlert color="error" dismissible onClose={onClose}>
        <RATypography variant="body2" color="inherit">
          {message}
        </RATypography>
      </RAAlert>
    </RABox>
  );
}

function AssessmentLoadingState() {
  return (
    <RABox p={5} display="flex" justifyContent="center">
      <CircularProgress size={60} thickness={4} color="primary" disableShrink />
    </RABox>
  );
}

export default function AddEditRecipientAssessmentForm() {
  const { t } = useTranslation();
  const formController = useRecipientAssessmentForm();
  const assessmentForm = formController.form;

  if (formController.isAssessmentLoading) {
    return <AssessmentLoadingState />;
  }

  return (
    <>
      <RABox
        component="form"
        onSubmit={formController.handleSubmit}
        display="flex"
        flexDirection="column"
        gap={3}
        p={3}
        maxWidth="1200px"
        width="100%"
        mx="auto"
      >
        <RATypography variant="h4" fontWeight="bold" align="center">
          {formController.isEditMode
            ? t("recipientAssessments.form.editTitle")
            : t("recipientAssessments.form.newTitle")}
        </RATypography>

        <AssessmentDetailsSection
          recipientId={assessmentForm.recipientId}
          configurationId={assessmentForm.configurationId}
          name={assessmentForm.name}
          description={assessmentForm.description}
          recipients={formController.recipients}
          configurationOptions={formController.configurationOptions}
          isEditMode={formController.isEditMode}
          isReadOnly={formController.isReadOnly}
          onRecipientChange={formController.handleRecipientChange}
          onConfigurationChange={formController.handleConfigurationChange}
          onNameChange={(value) =>
            formController.handleFieldChange("name", value)
          }
          onDescriptionChange={(value) =>
            formController.handleFieldChange("description", value)
          }
        />

        <QuestionnaireSection
          configurationId={assessmentForm.configurationId}
          loading={formController.isConfigurationLoading}
          categories={formController.recipientCategories}
          questionsByCategory={formController.localizedQuestionsByCategory}
          questionnaireValues={formController.questionnaireValues}
          activeCategoryCode={formController.activeCategoryCode}
          onCategoryChange={formController.setActiveCategoryCode}
          onAnswerChange={formController.handleAnswerChange}
          isReadOnly={formController.isReadOnly}
          showAllErrors={formController.showAllErrors}
        />

        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          sx={{ alignSelf: "center", mt: 3, minWidth: 200 }}
          disabled={formController.isSubmitDisabled}
        >
          {formController.isEditMode
            ? t("recipientAssessments.form.updateButton")
            : t("recipientAssessments.form.createButton")}
        </RAButton>
      </RABox>

      <FloatingAssessmentAlert
        message={formController.errorMessage}
        onClose={formController.clearError}
      />
    </>
  );
}

FloatingAssessmentAlert.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

FloatingAssessmentAlert.defaultProps = {
  message: null,
};
