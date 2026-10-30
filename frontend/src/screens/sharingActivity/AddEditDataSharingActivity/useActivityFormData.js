import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";

import { fetchRecipients } from "store/recipients/recipientsThunks";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchDatasetAssessments } from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchRecipientAssessments } from "store/recipientAssessments/recipientAssessmentsThunks";
import {
  createDataSharingActivity,
  fetchDataSharingActivities,
  updateDataSharingActivity,
} from "store/dataSharingActivities/dataSharingActivitiesThunks";

/**
 * Redux data of the Data Sharing Activity form: every dataset, assessment and activity the user can
 * see, and saving the activity.
 */
export default function useActivityFormData(activityId) {
  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();

  const recipients = useSelector((state) => state.recipients.items);
  const datasets = useSelector((state) => state.datasets.items);
  const datasetAssessments = useSelector((state) => state.datasetAssessments.items);
  const recipientAssessments = useSelector((state) => state.recipientAssessments.items);
  const { items: activities, status } = useSelector((state) => state.dataSharingActivities);

  useEffect(() => {
    if (!token) return;

    dispatch(fetchDatasets(token));
    dispatch(fetchRecipients(token));
    dispatch(fetchDatasetAssessments(token));
    dispatch(fetchRecipientAssessments(token));
    dispatch(fetchDataSharingActivities(token));
  }, [dispatch, token]);

  const existingActivity = activityId
    ? activities.find((activity) => activity.id === activityId) || null
    : null;

  // Resolves with the saved activity; rejects with the backend's message.
  const saveActivity = (payload) =>
    dispatch(
      activityId
        ? updateDataSharingActivity({ id: activityId, updatedActivity: payload, token })
        : createDataSharingActivity({ newActivity: payload, token })
    ).unwrap();

  return {
    recipients,
    datasets,
    datasetAssessments,
    recipientAssessments,
    existingActivity,
    status,
    saveActivity,
  };
}
