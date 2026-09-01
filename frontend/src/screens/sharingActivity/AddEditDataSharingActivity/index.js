import React from "react";
import { Checkbox, FormControlLabel } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RASelect from "components/input/RASelect";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAAlert from "components/feedback/RAAlert";
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
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    isEdit,
    status,
    name,
    description,
    datasetId,
    datasetAssessmentId,
    recipientId,
    recipientAssessmentId,
    overrideTables,
    tables,
    sharedUsers,
    errorMessage,
    nameError,
    lockError,
    isReadOnly,
    isSubmitDisabled,
    selectedScoringSystem,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
    datasetOptions,
    datasetAssessmentOptions,
    recipientOptions,
    recipientAssessmentOptions,
    handleNameCommit,
    handleDescriptionCommit,
    handleSharedUsersChange,
    handleDatasetChange,
    handleDatasetAssessmentChange,
    handleRecipientChange,
    handleRecipientAssessmentChange,
    handleOverrideTablesChange,
    handleTablesChange,
    handleSubmit,
    setErrorMessage,
    setLockError,
  } = useDataSharingActivityForm();

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

        <OnBlurRAInput
          label={t("dataSharingActivities.form.activityNameLabel")}
          value={name}
          onCommit={handleNameCommit}
          fullWidth
          required
          error={nameError}
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

        <RASelect
          label={t("dataSharingActivities.form.recipientLabel")}
          value={recipientId}
          onChange={handleRecipientChange}
          options={recipientOptions}
          fullWidth
          sx={selectSx}
          disabled={isReadOnly}
        />

        <RASelect
          label={t("dataSharingActivities.form.recipientAssessmentLabel")}
          value={recipientAssessmentId}
          onChange={handleRecipientAssessmentChange}
          options={recipientAssessmentOptions}
          fullWidth
          disabled={!recipientId || isReadOnly}
          sx={selectSx}
        />

        <RASelect
          label={t("dataSharingActivities.form.datasetLabel")}
          value={datasetId}
          onChange={handleDatasetChange}
          options={datasetOptions}
          fullWidth
          sx={selectSx}
          disabled={isReadOnly}
        />

        <RASelect
          label={t("dataSharingActivities.form.datasetAssessmentLabel")}
          value={datasetAssessmentId}
          onChange={handleDatasetAssessmentChange}
          options={datasetAssessmentOptions}
          fullWidth
          disabled={!datasetId || isReadOnly}
          sx={selectSx}
        />

        {datasetAssessmentId && (
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

        {overrideTables && (
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

      <RABox
        sx={{
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          zIndex: theme.zIndex.snackbar,
          width: 300,
          marginBottom: theme.spacing(3),
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {lockError && (
          <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
            <RATypography variant="body2" color="white">
              {lockError}
            </RATypography>
          </RAAlert>
        )}

        {errorMessage && (
          <RAAlert
            color="error"
            dismissible
            onClose={() => setErrorMessage("")}
          >
            <RATypography variant="body2" color="white">
              {errorMessage}
            </RATypography>
          </RAAlert>
        )}

        {status === "loading" && (
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              {t("dataSharingActivities.alerts.loading")}
            </RATypography>
          </RAAlert>
        )}

        {status === "failed" && !errorMessage && (
          <RAAlert color="error" dismissible>
            <RATypography variant="body2" color="white">
              {t("dataSharingActivities.alerts.error")}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    </>
  );
}
