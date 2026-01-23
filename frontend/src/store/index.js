import { configureStore } from "@reduxjs/toolkit";

import datasetsReducer from "./datasets/datasetsSlice";
import datasetAssessmentsReducer from "./datasetAssessments/datasetAssessmentsSlice";
import questionsReducer from "./questions/questionsSlice";
import recipientsReducer    from "./recipients/recipientsSlice";
import recipientAssessmentsReducer from "./recipientAssessments/recipientAssessmentsSlice";
import dataSharingActivitiesReducer from "./dataSharingActivities/dataSharingActivitiesSlice";
import reportsReducer from "./reports/reportsSlice";
import riskBandsReducer from "./riskBands/riskBandsSlice";

export const store = configureStore({
  reducer: {
    reports: reportsReducer,
    questions: questionsReducer,
    riskBands: riskBandsReducer,
    datasets: datasetsReducer,
    datasetAssessments: datasetAssessmentsReducer,
    recipients: recipientsReducer,
    recipientAssessments: recipientAssessmentsReducer,
    dataSharingActivities: dataSharingActivitiesReducer,
  },
});
