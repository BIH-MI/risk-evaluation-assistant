/**
 * Values, validation and API payload of the Data Sharing Activity form. Inputs hold strings (lists
 * for multi-selects); "" means not specified and is sent as null, never as zero.
 */
import { buildTableOverridesPayload } from "./dataSharingActivityFormUtils";

const CURRENCY_CODE = /^[A-Z]{3}$/;

const isBlank = (value) => String(value ?? "").trim() === "";
const toInputValue = (value) => (value === null || value === undefined ? "" : String(value));
const textOrNull = (value) => (isBlank(value) ? null : String(value).trim());
const numberOrNull = (value) => (isBlank(value) ? null : Number(value));

/** Form values of an activity response, or of a new activity when called without one. */
export function activityToFormValues(activity = {}) {
  const requirements = activity.requirements || {};

  return {
    name: activity.name || "",
    description: activity.description || "",
    datasetId: toInputValue(activity.datasetId),
    recipientId: toInputValue(activity.recipientId),
    datasetAssessmentId: toInputValue(activity.datasetAssessmentId),
    recipientAssessmentId: toInputValue(activity.recipientAssessmentId),
    sharingPurpose: activity.sharingPurpose || "",
    mitigationKnowledgeBaseVersionId: toInputValue(activity.mitigationKnowledgeBaseVersionId),
    maximumSetupTimeDays: toInputValue(requirements.maximumSetupTimeDays),
    availableBudget: toInputValue(requirements.availableBudget),
    budgetCurrency: toInputValue(requirements.budgetCurrency),
    requiredTemporalResolution: toInputValue(requirements.requiredTemporalResolution),
    minimumCohortRetentionPercent: toInputValue(requirements.minimumCohortRetentionPercent),
    analysisDataNeeded: requirements.analysisDataNeeded || [],
    requiredExternalDeliverables: requirements.requiredExternalDeliverables || [],
    sharingArrangement: toInputValue(requirements.sharingArrangement),
  };
}

export const EMPTY_ACTIVITY_FORM_VALUES = activityToFormValues();

function numberError(value, { integer = false, max } = {}) {
  if (isBlank(value)) return undefined;

  const number = Number(value);
  if (!Number.isFinite(number)) return "dataSharingActivities.validation.invalidNumber";
  if (number < 0) return "dataSharingActivities.validation.negativeNumber";
  if (integer && !Number.isInteger(number)) return "dataSharingActivities.validation.wholeDays";
  if (max !== undefined && number > max) return "dataSharingActivities.validation.percentAboveMax";
  return undefined;
}

// A secure remote analysis keeps the data inside the custodian's environment.
function deliverablesError({ sharingArrangement, requiredExternalDeliverables }) {
  return sharingArrangement === "SECURE_REMOTE_ANALYSIS" &&
    requiredExternalDeliverables.includes("ANONYMIZED_DOWNLOADABLE_DATASET")
    ? "dataSharingActivities.validation.downloadableDatasetNotAllowed"
    : undefined;
}

// A budget can only be compared with cost estimates in the same currency.
function budgetCurrencyError({ availableBudget, budgetCurrency }) {
  if (isBlank(budgetCurrency)) {
    return isBlank(availableBudget) ? undefined : "dataSharingActivities.validation.currencyRequired";
  }
  return CURRENCY_CODE.test(budgetCurrency.trim())
    ? undefined
    : "dataSharingActivities.validation.currencyFormat";
}

/**
 * Client-side mirror of the backend validation. Returns the translation key of the message for
 * each invalid field, in form order; an empty object means the activity can be saved.
 */
export function validateActivityForm(values) {
  const errors = {
    name: isBlank(values.name) ? "dataSharingActivities.validation.nameRequired" : undefined,
    datasetAssessmentId: values.datasetAssessmentId
      ? undefined
      : "dataSharingActivities.validation.datasetAssessmentRequired",
    recipientAssessmentId: values.recipientAssessmentId
      ? undefined
      : "dataSharingActivities.validation.recipientAssessmentRequired",
    requiredExternalDeliverables: deliverablesError(values),
    maximumSetupTimeDays: numberError(values.maximumSetupTimeDays, { integer: true }),
    availableBudget: numberError(values.availableBudget),
    budgetCurrency: budgetCurrencyError(values),
    minimumCohortRetentionPercent: numberError(values.minimumCohortRetentionPercent, { max: 100 }),
  };

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

function buildRequirementsPayload(values) {
  return {
    maximumSetupTimeDays: numberOrNull(values.maximumSetupTimeDays),
    availableBudget: numberOrNull(values.availableBudget),
    budgetCurrency: textOrNull(values.budgetCurrency),
    requiredTemporalResolution: textOrNull(values.requiredTemporalResolution),
    minimumCohortRetentionPercent: numberOrNull(values.minimumCohortRetentionPercent),
    analysisDataNeeded: values.analysisDataNeeded,
    requiredExternalDeliverables: values.requiredExternalDeliverables,
    sharingArrangement: textOrNull(values.sharingArrangement),
  };
}

/**
 * API payload of a Data Sharing Activity. A null knowledge-base version keeps the current pin (a
 * new activity is pinned to the default knowledge base). Table overrides are sent only while
 * override mode is enabled.
 */
export function buildDataSharingActivityPayload({ values, sharedUsernames, overrideTables, tables }) {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    sharedUsernames,
    datasetAssessmentId: Number(values.datasetAssessmentId),
    recipientAssessmentId: Number(values.recipientAssessmentId),
    sharingPurpose: textOrNull(values.sharingPurpose),
    mitigationKnowledgeBaseVersionId: numberOrNull(values.mitigationKnowledgeBaseVersionId),
    requirements: buildRequirementsPayload(values),
    tableAssessments: overrideTables ? buildTableOverridesPayload(tables) : [],
  };
}

/**
 * Assessments of the selected dataset or recipient (resourceKey "datasetId" or "recipientId");
 * none until one is selected.
 */
export function assessmentsForResource(assessments, resourceKey, resourceId) {
  if (!resourceId) return [];
  return assessments.filter((assessment) => String(assessment[resourceKey]) === String(resourceId));
}

/** Choosing another dataset clears the dataset assessment, which belonged to the previous one. */
export const selectDataset = (values, datasetId) => ({ ...values, datasetId, datasetAssessmentId: "" });

/** Choosing another recipient clears the recipient assessment, which belonged to the previous one. */
export const selectRecipient = (values, recipientId) => ({
  ...values,
  recipientId,
  recipientAssessmentId: "",
});
