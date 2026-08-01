/**
 All of the routes are added here
 You can add a new route, customize the routes and delete the routes here.

 Once you add a new route on this file it will be visible automatically on
 the Sidenav.

 For adding a new route you can follow the existing routes in the routes array.
 1. The `type` key with the `collapse` value is used for a route.
 2. The `type` key with the `title` value is used for a title inside the Sidenav.
 3. The `type` key with the `divider` value is used for a divider between Sidenav items.
 4. The `name` key is used for the name of the route on the Sidenav.
 5. The `key` key is used for the key of the route (It will help you with the key prop inside a loop).
 6. The `icon` key is used for the icon of the route on the Sidenav, you have to add a node.
 7. The `collapse` key is used for making a collapsible item on the Sidenav that has other routes
 inside (nested routes), you need to pass the nested routes inside an array as a value for the `collapse` key.
 8. The `route` key is used to store the route location which is used for the react router.
 9. The `href` key is used to store the external links location.
 10. The `title` key is only for the item with the type of `title` and its used for the title text on the Sidenav.
 10. The `component` key is used to store the component of its route.
 */

import Icon from "@mui/material/Icon";

import Datasets from "screens/datasets";
import AddDatasetForm from "screens/datasets/AddDatasetForm";
import EditDatasetForm from "screens/datasets/EditDatasetForm";
import DatasetAssessments from "screens/datasetAssessments";
import Documentation from "screens/documentation";
import Recipients from "./screens/recipients";
import AddEditRecipientForm from "./screens/recipients/AddEditRecipientForm";
import RecipientAssessments from "./screens/recipientAssessments";
import AddEditDataSharingActivity from "./screens/sharingActivity/AddEditDataSharingActivity";
import DataSharingActivities from "./screens/sharingActivity";
import DataSharingReport from "./screens/report";
import AddEditRecipientAssessmentForm from "./screens/recipientAssessments/AddEditRecipientAssessmentForm";
import AddEditDatasetAssessmentForm from "./screens/datasetAssessments/AddEditDatasetAssessmentForm";
import ConfigurationPage from "./screens/configurations";
import AddEditConfigurationForm from "./screens/configurations/AddEditConfigurationForm";

const routes = [
  {
    type: "collapse",
    name: "navigation.datasets",
    key: "datasets",
    route: "/datasets",
    icon: <Icon fontSize="small">dataset</Icon>,
    component: <Datasets />,
  },
  {
    type: "route",
    name: "navigation.addDataset",
    key: "datasets-new",
    route: "/datasets/new",
    component: <AddDatasetForm />,
  },
  {
    type: "route",
    name: "navigation.editDataset",
    key: "datasets-edit",
    route: "/datasets/:datasetId/edit",
    component: <EditDatasetForm />,
  },
  {
    type: "route",
    name: "navigation.datasetAssessments",
    key: "dataset-assessments-by-dataset",
    route: "/datasets/:datasetId/assessments",
    icon: <Icon fontSize="small">subdirectory_arrow_right</Icon>,
    component: <DatasetAssessments />,
  },
  {
    type: "collapse",
    name: "navigation.datasetAssessments",
    key: "datasets/assessments",
    route: "/datasets/assessments",
    icon: <Icon fontSize="small">subdirectory_arrow_right</Icon>,
    component: <DatasetAssessments />,
  },
  {
    type: "route",
    name: "navigation.addDatasetAssessment",
    key: "dataset-assessments-new",
    route: "/datasets/:datasetId/assessments/new",
    component: <AddEditDatasetAssessmentForm />,
  },
  {
    type: "route",
    name: "navigation.editDatasetAssessment",
    key: "dataset-assessments-edit",
    route: "/datasets/:datasetId/assessments/:assessmentId/edit",
    component: <AddEditDatasetAssessmentForm />,
  },
  {
    type: "divider",
    key: "divider-dataset",
  },
  {
    type: "collapse",
    name: "navigation.recipients",
    key: "recipients",
    route: "/recipients",
    icon: <Icon fontSize="small">group</Icon>,
    component: <Recipients />,
  },
  {
    type: "route",
    name: "navigation.addRecipient",
    key: "recipients-new",
    route: "/recipients/new",
    component: <AddEditRecipientForm />,
  },
  {
    type: "route",
    name: "navigation.editRecipient",
    key: "recipients-edit",
    route: "/recipients/:recipientId/edit",
    component: <AddEditRecipientForm />,
  },
  {
    type: "collapse",
    name: "navigation.recipientAssessments",
    key: "recipients/assessments",
    route: "/recipients/assessments",
    icon: <Icon fontSize="small">subdirectory_arrow_right</Icon>,
    component: <RecipientAssessments />,
  },
  {
    type: "route",
    name: "navigation.recipientAssessments",
    key: "recipient-assessments-by-recipient",
    route: "/recipients/:recipientId/assessments",
    icon: <Icon fontSize="small">subdirectory_arrow_right</Icon>,
    component: <RecipientAssessments />,
  },
  {
    type: "route",
    name: "navigation.addRecipientAssessment",
    key: "recipient-assessments-new",
    route: "/recipients/:recipientId/assessments/new",
    component: <AddEditRecipientAssessmentForm />,
  },
  {
    type: "route",
    name: "navigation.editRecipientAssessment",
    key: "recipient-assessments-edit",
    route: "/recipients/:recipientId/assessments/:assessmentId/edit",
    component: <AddEditRecipientAssessmentForm />,
  },
  {
    type: "divider",
    key: "divider-recipient",
  },
  {
    type: "collapse",
    name: "navigation.dataSharingActivities",
    key: "data-sharing-activities",
    route: "/data-sharing-activities",
    icon: <Icon fontSize="small">assessment</Icon>,
    component: <DataSharingActivities />,
  },
  {
    key: "data-sharing-activities-new",
    route: "/data-sharing-activities/new",
    component: <AddEditDataSharingActivity />,
  },
  {
    key: "data-sharing-activities-edit",
    route: "/data-sharing-activities/:id/edit",
    component: <AddEditDataSharingActivity />,
  },
  {
    key: "data-sharing-activities-report",
    route: "/data-sharing-activities/:id/report",
    component: <DataSharingReport />,
  },
  {
    type: "divider",
    key: "divider-config",
  },
  {
    type: "collapse",
    name: "navigation.configurations",
    key: "configuration",
    route: "/configuration",
    icon: <Icon fontSize="small">settings</Icon>,
    component: <ConfigurationPage />,
  },
  {
    key: "configuration-new",
    route: "/configuration/new",
    component: <AddEditConfigurationForm />,
  },
  {
    key: "configuration-edit-id",
    route: "/configuration/:id/edit",
    component: <AddEditConfigurationForm />,
  },
  {
    key: "configuration-view-id",
    route: "/configuration/:id/view",
    component: <AddEditConfigurationForm />,
  },
  {
    key: "configuration-edit",
    route: "/configuration/edit",
    component: <AddEditConfigurationForm />,
  },
  {
    type: "divider",
    key: "divide-last-config",
  },
  {
    type: "route",
    name: "navigation.documentation",
    key: "documentation",
    route: "/documentation",
    icon: <Icon fontSize="small">article</Icon>,
    component: <Documentation />,
  },
];

export default routes;
