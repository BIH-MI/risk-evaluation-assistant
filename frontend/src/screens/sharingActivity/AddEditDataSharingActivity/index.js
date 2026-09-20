import React from "react";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RASelect from "components/input/RASelect";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import DatasetTablesAssessment from "components/display/Tables/DataTable/CustomDataTableComponents/DatasetTablesAssessment";
import { useDataSharingActivityForm } from "./useDataSharingActivityForm";

const selectSx = {
  "& .MuiOutlinedInput-root": { height: 56 },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
};

/**
 * Create/Edit Data Sharing Activity screen.
 *
 * The screen binds an existing Dataset Assessment and Recipient Assessment into
 * a sharing scenario. Users may optionally override the dataset's attribute
 * assessment for this specific activity.
 */
export default function AddEditDataSharingActivity() {
  const { t } = useTranslation();
  const {
    isEdit,
    status,
    name,
    description,
    projectId,
    datasetAssessmentId,
    recipientAssessmentId,
    overrideTables,
    tables,
    sharedUsers,
    errorMessage,
    lockError,
    isReadOnly,
    isSubmitDisabled,
    selectedScoringSystem,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
    noProjectsAvailable,
    canSelectAssessments,
    projectOptions,
    datasetAssessmentOptions,
    recipientAssessmentOptions,
    handleNameCommit,
    handleDescriptionCommit,
    handleSharedUsersChange,
    handleProjectChange,
    handleDatasetAssessmentChange,
    handleRecipientAssessmentChange,
    handleOverrideTablesChange,
    handleTablesChange,
    handleCreateProjectClick,
    handleSubmit,
    setErrorMessage,
    setLockError,
  } = useDataSharingActivityForm();

  const assessmentHelperText = !canSelectAssessments
    ? t("dataSharingActivities.form.selectProjectFirst")
    : "";

  return (
    <>
      <RABox
        py={8}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: "80%",
          mx: "auto",
          gap: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <RATypography variant="h5" textAlign="center">
          {isEdit
            ? t("dataSharingActivities.form.editTitle")
            : t("dataSharingActivities.form.createTitle")}
        </RATypography>

        <RASelect
          label={t("dataSharingActivities.form.projectLabel")}
          value={projectId}
          onChange={handleProjectChange}
          options={projectOptions}
          fullWidth
          required
          helperText={
            noProjectsAvailable
              ? t("dataSharingActivities.form.noProjectsAvailable")
              : ""
          }
          sx={selectSx}
          disabled={isReadOnly || noProjectsAvailable}
        />

        {noProjectsAvailable && (
          <RABox display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <RATypography variant="body2">
              {t("dataSharingActivities.form.createProjectPrompt")}
            </RATypography>
            <RAButton
              type="button"
              variant="outlined"
              color="info"
              onClick={handleCreateProjectClick}
            >
              {t("dataSharingActivities.form.createProjectButton")}
            </RAButton>
          </RABox>
        )}

        <RASelect
          label={t("dataSharingActivities.form.datasetAssessmentLabel")}
          value={canSelectAssessments ? datasetAssessmentId : ""}
          onChange={handleDatasetAssessmentChange}
          options={datasetAssessmentOptions}
          fullWidth
          required
          disabled={!canSelectAssessments || isReadOnly || noProjectsAvailable}
          helperText={assessmentHelperText}
          sx={selectSx}
        />

        <RASelect
          label={t("dataSharingActivities.form.recipientAssessmentLabel")}
          value={canSelectAssessments ? recipientAssessmentId : ""}
          onChange={handleRecipientAssessmentChange}
          options={recipientAssessmentOptions}
          fullWidth
          required
          disabled={!canSelectAssessments || isReadOnly || noProjectsAvailable}
          helperText={assessmentHelperText}
          sx={selectSx}
        />

        <OnBlurRAInput
          label={t("dataSharingActivities.form.activityNameLabel")}
          value={name}
          onCommit={handleNameCommit}
          fullWidth
          required
          disabled={isReadOnly}
        />

        <OnBlurRAInput
          label={t("dataSharingActivities.form.descriptionLabel")}
          value={description}
          onCommit={handleDescriptionCommit}
          fullWidth
          multiline
          rows={3}
          disabled={isReadOnly}
        />

        <RAUserAutocomplete
          multiple
          label={t("dataSharingActivities.form.sharedUsersLabel")}
          value={sharedUsers}
          onChange={handleSharedUsersChange}
          placeholder={t("dataSharingActivities.form.searchUsersPlaceholder")}
          fullWidth
          sx={selectSx}
          disabled={isReadOnly}
        />

        {canSelectAssessments && datasetAssessmentId && (
          <FormControlLabel
            control={
              <Checkbox
                checked={overrideTables}
                onChange={handleOverrideTablesChange}
                disabled={isReadOnly}
              />
            }
            label={t("dataSharingActivities.form.overrideTablesLabel")}
            sx={{ my: 2 }}
          />
        )}

        {canSelectAssessments && overrideTables && (
          <RABox>
            <RATypography variant="h6" align="center" mt={2}>
              {t("dataSharingActivities.form.datasetTablesAssessment")}
            </RATypography>

            <DatasetTablesAssessment
              tables={tables}
              setTables={handleTablesChange}
              isReadOnly={isReadOnly}
              scoringSystem={selectedScoringSystem}
              attributeEvidenceById={attributeEvidenceById}
              originalAssessmentValuesByAttributeId={
                originalAssessmentValuesByAttributeId
              }
            />
          </RABox>
        )}

        <RAButton
          type="submit"
          sx={{ alignSelf: "center", mt: 2 }}
          disabled={isSubmitDisabled}
        >
          {isEdit
            ? t("dataSharingActivities.form.updateButton")
            : t("dataSharingActivities.form.createButton")}
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
            id: "errorMessage",
            color: "error",
            message: errorMessage,
            onClose: () => setErrorMessage(""),
          },
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message:
              status === "loading"
                ? t("dataSharingActivities.alerts.loading")
                : "",
          },
          {
            id: "statusFailed",
            color: "error",
            message:
              status === "failed" && !errorMessage
                ? t("dataSharingActivities.alerts.error")
                : "",
          },
        ]}
      />
    </>
  );
}
