import { configureStore } from "@reduxjs/toolkit";

import datasetsReducer from "./datasets/datasetsSlice";
import datasetAssessmentsReducer from "./datasetAssessments/datasetAssessmentsSlice";
import recipientsReducer from "./recipients/recipientsSlice";
import recipientAssessmentsReducer from "./recipientAssessments/recipientAssessmentsSlice";
import dataSharingActivitiesReducer from "./dataSharingActivities/dataSharingActivitiesSlice";
import configurationReducer from "./configurations/configurationSlice";
import projectsReducer from "./projects/projectsSlice";

import qidDiscoveryReducer from "features/qidDiscovery/state/qidDiscoverySlice";
import { aiModelInstallationListener } from "features/qidDiscovery/state/aiModelInstallationListener";

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(aiModelInstallationListener.middleware),
  reducer: {
    qidDiscovery: qidDiscoveryReducer,
    datasets: datasetsReducer,
    datasetAssessments: datasetAssessmentsReducer,
    recipients: recipientsReducer,
    recipientAssessments: recipientAssessmentsReducer,
    projects: projectsReducer,
    dataSharingActivities: dataSharingActivitiesReducer,
    configurations: configurationReducer,
  },
});
