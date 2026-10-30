import React from "react";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAButton from "components/input/RAButton";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import AdministrativeRequirementsSection from "./components/AdministrativeRequirementsSection";
import AssessmentsSection from "./components/AssessmentsSection";
import BasicInformationSection from "./components/BasicInformationSection";
import KnowledgeBaseVersionSelect from "./components/KnowledgeBaseVersionSelect";
import PurposeSection from "./components/PurposeSection";
import SharedUsersSelect from "./components/SharedUsersSelect";
import TableOverridesSection from "./components/TableOverridesSection";
import { useDataSharingActivityForm } from "./useDataSharingActivityForm";

/**
 * Create/Edit Data Sharing Activity screen.
 *
 * An activity combines an assessment of a dataset and an assessment of a recipient into a sharing
 * scenario, and states the purpose and requirements the mitigation planner checks plans against.
 * Users may optionally override the dataset's attribute assessment for this specific activity.
 */
export default function AddEditDataSharingActivity() {
  const { t } = useTranslation();
  const form = useDataSharingActivityForm();
  const { values, errors, setValue, isReadOnly } = form;

  return (
    <>
      <RABox
        py={8}
        component="form"
        onSubmit={form.handleSubmit}
        sx={{
          width: { xs: "94%", md: "80%" },
          "& .MuiSelect-icon": { display: "block" },
          "& .MuiSelect-select": { paddingRight: "36px !important" },
          mx: "auto",
          gap: 4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <RATypography variant="h5" textAlign="center">
          {form.isEdit
            ? t("dataSharingActivities.form.editTitle")
            : t("dataSharingActivities.form.createTitle")}
        </RATypography>

        <BasicInformationSection
          name={values.name}
          description={values.description}
          onChange={setValue}
          disabled={isReadOnly}
        >
          <SharedUsersSelect
            users={form.sharedUsers}
            onChange={form.changeSharedUsers}
            disabled={isReadOnly}
          />
          <KnowledgeBaseVersionSelect
            value={values.mitigationKnowledgeBaseVersionId}
            onChange={(value) => setValue("mitigationKnowledgeBaseVersionId", value)}
            isEdit={form.isEdit}
            activity={form.existingActivity}
            disabled={isReadOnly}
          />
        </BasicInformationSection>

        <AssessmentsSection
          values={values}
          datasets={form.datasets}
          recipients={form.recipients}
          datasetAssessments={form.datasetAssessments}
          recipientAssessments={form.recipientAssessments}
          onDatasetChange={form.changeDataset}
          onRecipientChange={form.changeRecipient}
          onDatasetAssessmentChange={form.changeDatasetAssessment}
          onRecipientAssessmentChange={(id) => setValue("recipientAssessmentId", id)}
          disabled={isReadOnly}
        />

        <PurposeSection values={values} errors={errors} onChange={setValue} disabled={isReadOnly} />

        <AdministrativeRequirementsSection
          values={values}
          errors={errors}
          onChange={setValue}
          disabled={isReadOnly}
        />

        <TableOverridesSection tableOverrides={form.tableOverrides} disabled={isReadOnly} />

        <RAButton type="submit" sx={{ alignSelf: "center" }} disabled={!form.canSubmit}>
          {form.isEdit
            ? t("dataSharingActivities.form.updateButton")
            : t("dataSharingActivities.form.createButton")}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "lockError",
            color: "error",
            message: form.lockError,
            onClose: form.clearLockError,
          },
          {
            id: "errorMessage",
            color: "error",
            message: form.errorMessage,
            onClose: form.clearErrorMessage,
          },
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message: form.status === "loading" ? t("dataSharingActivities.alerts.loading") : "",
          },
          {
            id: "statusFailed",
            color: "error",
            message:
              form.status === "failed" && !form.errorMessage
                ? t("dataSharingActivities.alerts.error")
                : "",
          },
        ]}
      />
    </>
  );
}
