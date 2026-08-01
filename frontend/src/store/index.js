import { configureStore } from "@reduxjs/toolkit";

import datasetsReducer from "./datasets/datasetsSlice";
import datasetAssessmentsReducer from "./datasetAssessments/datasetAssessmentsSlice";
import recipientsReducer    from "./recipients/recipientsSlice";
import recipientAssessmentsReducer from "./recipientAssessments/recipientAssessmentsSlice";
import dataSharingActivitiesReducer from "./dataSharingActivities/dataSharingActivitiesSlice";
import configurationReducer from "./configurations/configurationSlice";

export const store = configureStore({
  reducer: {
    datasets: datasetsReducer,
    datasetAssessments: datasetAssessmentsReducer,
    recipients: recipientsReducer,
    recipientAssessments: recipientAssessmentsReducer,
    dataSharingActivities: dataSharingActivitiesReducer,
    configurations: configurationReducer,
  },
});
