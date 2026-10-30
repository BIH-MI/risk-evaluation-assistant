import { SHARING_ARRANGEMENT_OPTIONS } from "utils/sharingArrangementLabels";

// ISO 4217 codes offered for the available budget; cost estimates are compared only in the same currency.
export const CURRENCY_CODES = ["EUR", "CHF", "USD", "GBP", "CAD", "AUD", "JPY", "CNY", "DKK", "NOK", "SEK", "PLN", "CZK"];

// Choices of the select requirements, in the order of the backend enums.
export const REQUIREMENT_OPTIONS = {
  requiredTemporalResolution: ["DAY", "MONTH", "QUARTER", "YEAR", "NOT_REQUIRED"],
  analysisDataNeeded: ["INDIVIDUAL_LEVEL_DATA", "AGGREGATE_DATA", "SYNTHETIC_DATA"],
  requiredExternalDeliverables: [
    "ANONYMIZED_DOWNLOADABLE_DATASET",
    "AGGREGATE_RESULTS",
    "TABLES_FIGURES",
    "REPORT",
    "CODE",
  ],
  sharingArrangement: SHARING_ARRANGEMENT_OPTIONS,
};

// Requirements whose field explains itself in an info tooltip (translation activityRequirements.info.<name>).
export const REQUIREMENTS_WITH_INFO = new Set([
  "sharingArrangement",
  "requiredExternalDeliverables",
  "analysisDataNeeded",
  "requiredTemporalResolution",
  "minimumCohortRetentionPercent",
  "maximumSetupTimeDays",
  "availableBudget",
]);
