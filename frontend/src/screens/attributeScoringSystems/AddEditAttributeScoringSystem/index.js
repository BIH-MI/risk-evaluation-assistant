import React from "react";
import { CircularProgress, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";

import { ATTRIBUTE_DIMENSIONS } from "./attributeScoringSystemConstants";
import ConfigurationDetailsSection from "./components/ConfigurationDetailsSection";
import ScoreOptionsSection from "./components/ScoreOptionsSection";
import ThresholdsSection from "./components/ThresholdsSection";
import useAttributeScoringSystemForm from "./useAttributeScoringSystemForm";

export default function AddEditAttributeScoringSystem() {
  const theme = useTheme();
  const formController = useAttributeScoringSystemForm();

  if (!formController.isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            Only administrators can manage scoring systems.
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  if (formController.loading) {
    return (
      <RABox p={5} display="flex" justifyContent="center">
        <CircularProgress
          size={60}
          thickness={4}
          color="primary"
          disableShrink
        />
      </RABox>
    );
  }

  return (
    <RABox
      component="form"
      onSubmit={formController.handleSubmit}
      onKeyDown={formController.handleFormKeyDown}
      display="flex"
      flexDirection="column"
      maxWidth="800px"
      width="100%"
      mx="auto"
      gap={2}
      p={2}
    >
      <RATypography variant="h4" fontWeight="bold" align="center">
        {formController.isEditMode
          ? "Edit Scoring System"
          : "Create Scoring System"}
      </RATypography>

      <RABox display="flex" flexDirection="column" gap={2}>
        <ConfigurationDetailsSection
          form={formController.form}
          errors={formController.validationErrors.fields}
          showErrors={formController.showErrors}
          onChange={formController.updateField}
        />

        <Divider />

        <ThresholdsSection
          form={formController.form}
          errors={formController.validationErrors.thresholds}
          showErrors={formController.showErrors}
          ranges={formController.ranges}
          onChange={formController.updateField}
        />

        <Divider />

        <ScoreOptionsSection
          dimensions={ATTRIBUTE_DIMENSIONS}
          scoreOptions={formController.form.scoreOptions}
          dimensionRanges={formController.dimensionRanges}
          validationErrors={formController.validationErrors.options}
          showErrors={formController.showErrors}
          onAdd={formController.addScoreOption}
          onUpdate={formController.updateScoreOption}
          onUpdateValue={formController.updateScoreOptionValue}
          onRemove={formController.removeScoreOption}
          dimensionErrors={formController.validationErrors.dimensionErrors}
        />
      </RABox>

      <RABox display="flex" justifyContent="center" mt={2}>
        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={formController.saving}
          sx={{ minWidth: 200 }}
        >
          {formController.saving
            ? "Saving..."
            : formController.isEditMode
            ? "Update Scoring System"
            : "Create Scoring System"}
        </RAButton>
      </RABox>

      {formController.errorMessage && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            zIndex: theme.zIndex.snackbar,
            width: 360,
          }}
        >
          <RAAlert
            color="error"
            dismissible
            onClose={formController.clearError}
          >
            <RATypography variant="body2" color="white">
              {formController.errorMessage}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </RABox>
  );
}
