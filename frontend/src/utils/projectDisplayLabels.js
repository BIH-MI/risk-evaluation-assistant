const PROJECT_VALUE_LABELS = {
  INDIVIDUAL_LEVEL_DATA: "Individual-level Data",
  AGGREGATE_DATA: "Aggregate Data",
  SYNTHETIC_DATA: "Synthetic Data",
  DOWNLOADABLE_DATASET: "Anonymized Downloadable Dataset",
  ANONYMIZED_DOWNLOADABLE_DATASET: "Anonymized Downloadable Dataset",
  AGGREGATE_RESULTS: "Aggregate Results",
  TABLES_FIGURES: "Tables / Figures",
  REPORT: "Report",
  CODE: "Code",
  PUBLIC_RELEASE: "Public Release",
  CONTROLLED_TRANSFER: "Controlled Data Transfer",
  CONTROLLED_DATA_TRANSFER: "Controlled Data Transfer",
  SECURE_REMOTE_ANALYSIS: "Secure Remote Analysis",
  MANAGED_QUERY: "Managed Query",
  FEDERATED_ANALYSIS: "Federated Analysis",
  MODEL_ACCESS: "Model Access",
  ONE_TIME: "One Time",
  RECURRING: "Recurring",
  CONTINUOUS: "Continuous",
  NOT_REQUIRED: "Not Required",
  STANDARD_CPU: "Standard CPU",
  HIGH_MEMORY: "High Memory",
  GPU: "GPU",
  SETUP_ONLY: "Setup Only",
  SINGLE_SHARING_ACTIVITY: "Single Sharing Activity",
  WHOLE_PROJECT: "Whole Project",
  ANNUAL_OPERATION: "Annual Operation",
};

export function formatProjectEnumLabel(value) {
  if (PROJECT_VALUE_LABELS[value]) {
    return PROJECT_VALUE_LABELS[value];
  }

  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function formatSharingArrangement(value) {
  return formatProjectEnumLabel(value);
}
