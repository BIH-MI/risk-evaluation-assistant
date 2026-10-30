import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getErrorMessage } from "utils/errors";
import {
  EMPTY_ACTIVITY_FORM_VALUES,
  activityToFormValues,
  buildDataSharingActivityPayload,
  selectDataset,
  selectRecipient,
  validateActivityForm,
} from "./activityFormModel";
import useActivityEditLock from "./useActivityEditLock";
import useActivityFormData from "./useActivityFormData";
import useActivityTableOverrides from "./useActivityTableOverrides";
import useSharedUsers from "./useSharedUsers";

const findById = (items, id) => items.find((item) => String(item.id) === String(id)) || null;

/**
 * State of the Data Sharing Activity create/edit form: values, validation, edit initialization
 * and saving. Loading, the edit lock, table overrides and shared users have their own hooks.
 */
export function useDataSharingActivityForm() {
  const { id } = useParams();
  const activityId = id ? Number(id) : null;
  const isEdit = activityId !== null;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    datasets,
    recipients,
    datasetAssessments,
    recipientAssessments,
    existingActivity,
    status,
    saveActivity,
  } = useActivityFormData(activityId);
  const { hasLock, lockError, setLockError } = useActivityEditLock(activityId);
  const { sharedUsernames, sharedUsers, setSharedUsernames, changeSharedUsers } = useSharedUsers();

  const [values, setValues] = useState(EMPTY_ACTIVITY_FORM_VALUES);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tableOverrides = useActivityTableOverrides({
    datasets,
    datasetAssessments,
    selectedDatasetAssessment: findById(datasetAssessments, values.datasetAssessmentId),
  });
  const { loadActivityOverrides } = tableOverrides;

  // Edit mode fills the form once. Table overrides are normalized with the scoring system of
  // their Dataset Assessment, so initialization waits for that assessment; otherwise a fetch race
  // could apply the legacy scoring system and still mark the form as initialized.
  const initializedRef = useRef(false);
  const activityDatasetAssessment = existingActivity
    ? findById(datasetAssessments, existingActivity.datasetAssessmentId)
    : null;

  useEffect(() => {
    if (!existingActivity || initializedRef.current) return;
    if (existingActivity.tableAssessments?.length > 0 && !activityDatasetAssessment) return;

    initializedRef.current = true;
    setValues(activityToFormValues(existingActivity));
    setSharedUsernames(existingActivity.sharedUsernames || []);
    loadActivityOverrides(existingActivity, activityDatasetAssessment);
  }, [activityDatasetAssessment, existingActivity, loadActivityOverrides, setSharedUsernames]);

  const isReadOnly = (isEdit && !hasLock) || isSubmitting;
  const errors = validateActivityForm(values);
  const canSubmit =
    !isReadOnly && Object.keys(errors).length === 0 && (!isEdit || Boolean(existingActivity));

  const setValue = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const changeDatasetAssessment = (datasetAssessmentId) => {
    if (datasetAssessmentId === values.datasetAssessmentId) return;

    setValue("datasetAssessmentId", datasetAssessmentId);
    tableOverrides.resetForAssessment(findById(datasetAssessments, datasetAssessmentId));
  };

  const changeDataset = (datasetId) => {
    if (datasetId === values.datasetId) return;

    setValues((current) => selectDataset(current, datasetId));
    tableOverrides.resetForAssessment(null);
  };

  const changeRecipient = (recipientId) => {
    if (recipientId === values.recipientId) return;

    setValues((current) => selectRecipient(current, recipientId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isEdit && !hasLock) {
      setLockError(t("dataSharingActivities.alerts.lockLost"));
      return;
    }
    if (isSubmitting || (isEdit && !existingActivity)) return;

    // The submit button is disabled while the form is invalid; pressing Enter still submits.
    const [firstError] = Object.values(errors);
    if (firstError) {
      setErrorMessage(t(firstError));
      return;
    }

    setIsSubmitting(true);
    try {
      await saveActivity(
        buildDataSharingActivityPayload({
          values,
          sharedUsernames,
          overrideTables: tableOverrides.overrideTables,
          tables: tableOverrides.tables,
        })
      );
      navigate("/data-sharing-activities");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t("dataSharingActivities.alerts.saveFailed")));
      setIsSubmitting(false);
    }
  };

  return {
    isEdit,
    status,
    existingActivity,
    values,
    errors,
    setValue,
    isReadOnly,
    canSubmit,
    handleSubmit,
    datasets,
    recipients,
    datasetAssessments,
    recipientAssessments,
    changeDataset,
    changeRecipient,
    changeDatasetAssessment,
    tableOverrides,
    sharedUsers,
    changeSharedUsers,
    errorMessage,
    clearErrorMessage: () => setErrorMessage(""),
    lockError,
    clearLockError: () => setLockError(null),
  };
}
