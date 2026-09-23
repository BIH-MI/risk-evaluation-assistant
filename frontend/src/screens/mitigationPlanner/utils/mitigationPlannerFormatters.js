const DATA_TYPE_LABELS = {
  DATETIME: "Date/Time",
  DATE: "Date",
  BOOLEAN: "Boolean",
  DECIMAL: "Decimal",
  GEOSPATIAL: "Geospatial",
  INTEGER: "Integer",
  STRING: "String",
};

const ATTRIBUTE_ROLE_LABELS = {
  DIRECT_IDENTIFIER: "Direct Identifier",
  CANDIDATE_QID: "Candidate QID",
  SENSITIVE_ATTRIBUTE: "Sensitive Attribute",
  CANDIDATE_QID_COMBINATION: "Candidate QID combination",
};

const ACTION_TYPE_LABELS = {
  DATA_TRANSFORMATION: "Data transformation",
  CONTEXT_CONTROL: "Context control",
};

// Parameter-value compatibility with one Project requirement (e.g. target resolution).
const COMPATIBILITY_LABELS = {
  COMPATIBLE: "Compatible",
  INCOMPATIBLE: "Incompatible",
  EVALUATION_REQUIRED: "Needs evaluation",
};

const RISK_DRIVER_PRIORITY_LABELS = {
  CRITICAL: "Critical",
  HIGH: "High",
  OPTIONAL_IMPROVEMENT: "Additional improvement",
  NO_ACTION_REQUIRED: "No action required",
};

const RISK_DRIVER_SOURCE_LABELS = {
  DATASET_QUESTION: "Invasion of Privacy",
  RECIPIENT_QUESTION: "Recipient Assessment",
  DATASET_ATTRIBUTE: "Dataset Assessment",
  QID_COMBINATION: "Dataset Assessment",
};

const ANSWER_IMPACT_LABELS = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

export const formatAnswerImpact = (impact) => ANSWER_IMPACT_LABELS[impact] || humanizeCode(impact);

// Display fallback only: a missing estimate stays unknown (null) and is never treated as zero.
export const NOT_AVAILABLE = "N/A";

const isBlank = (value) =>
  value === null || value === undefined || value === "";

// Known Project option values get explicit labels; stored values are never changed.
const PROJECT_OPTION_LABELS = {
  INDIVIDUAL_LEVEL_DATA: "Individual-level Data",
  AGGREGATE_DATA: "Aggregate Data",
  SYNTHETIC_DATA: "Synthetic Data",
  ANONYMIZED_DOWNLOADABLE_DATASET: "Anonymized Downloadable Dataset",
  AGGREGATE_RESULTS: "Aggregate Results",
  TABLES_FIGURES: "Tables / Figures",
  REPORT: "Report",
  CODE: "Code",
  PUBLIC_RELEASE: "Public Release",
  CONTROLLED_DATA_TRANSFER: "Controlled Data Transfer",
  SECURE_REMOTE_ANALYSIS: "Secure Remote Analysis",
  MANAGED_QUERY: "Managed Query",
  ONE_TIME: "One Time",
  NOT_REQUIRED: "Not required",
};

/** Parameter label in sentence case: GENERALIZATION_HIERARCHY -> "Generalization hierarchy" */
export function formatParameterLabel(code) {
  const label = humanizeCode(code).toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** SINGLE_SHARING_ACTIVITY -> "Single Sharing Activity" */
export function humanizeCode(code) {
  if (isBlank(code)) return "";
  return String(code)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Human label for a Project/catalogue option value; humanizeCode is the fallback for custom values. */
export const formatOptionValue = (code) =>
  PROJECT_OPTION_LABELS[code] || humanizeCode(code);

export const formatDataType = (dataType) =>
  DATA_TYPE_LABELS[dataType] || humanizeCode(dataType);

export const formatAttributeRole = (role) =>
  ATTRIBUTE_ROLE_LABELS[role] || humanizeCode(role);

export const formatActionType = (actionType) =>
  ACTION_TYPE_LABELS[actionType] || humanizeCode(actionType);

export const formatCompatibility = (compatibility) =>
  COMPATIBILITY_LABELS[compatibility] || humanizeCode(compatibility);

export const formatRiskDriverPriority = (priority) =>
  RISK_DRIVER_PRIORITY_LABELS[priority] || humanizeCode(priority);

export const formatRiskDriverSource = (source) =>
  RISK_DRIVER_SOURCE_LABELS[source] || humanizeCode(source);

export function compatibilityColor(compatibility) {
  if (compatibility === "COMPATIBLE") return "success";
  if (compatibility === "INCOMPATIBLE") return "error";
  return "warning";
}

/** Stored requirement values are raw strings; render them by value type/unit. */
export function formatConstraintValue(constraint) {
  const { value, valueType, unit } = constraint || {};
  if (isBlank(value)) return "";

  switch (valueType) {
    case "MONEY": {
      const amount = Number(value);
      const formatted = Number.isFinite(amount)
        ? amount.toLocaleString()
        : value;
      return unit ? `${unit} ${formatted}` : formatted;
    }
    case "DATE": {
      const date = new Date(`${value}T00:00:00`);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString();
    }
    case "SINGLE_SELECT":
    case "MULTI_SELECT":
      return String(value).split(",").map(formatOptionValue).join(", ");
    case "YES_NO":
    case "YES_NO_UNKNOWN":
      return formatOptionValue(value);
    default:
      if (unit === "PERCENT") return `${value}%`;
      if (unit) return `${value} ${humanizeCode(unit).toLowerCase()}`;
      return value;
  }
}

function formatAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString() : String(value);
}

/**
 * Missing estimates are UNKNOWN and are never rendered as zero.
 */
export function formatCostEstimate(estimate) {
  const { costMin, costMax, currency } = estimate || {};
  if (isBlank(costMin) && isBlank(costMax)) return NOT_AVAILABLE;

  const prefix = currency ? `${currency} ` : "";
  if (isBlank(costMin) || isBlank(costMax) || costMin === costMax) {
    return `${prefix}${formatAmount(isBlank(costMin) ? costMax : costMin)}`;
  }
  return `${prefix}${formatAmount(costMin)} – ${formatAmount(costMax)}`;
}

export function formatSetupEstimate(estimate) {
  const { setupDaysMin, setupDaysMax } = estimate || {};
  if (isBlank(setupDaysMin) && isBlank(setupDaysMax)) return NOT_AVAILABLE;

  const single = isBlank(setupDaysMin) ? setupDaysMax : setupDaysMin;
  const unit = (days) => (Number(days) === 1 ? "day" : "days");
  if (isBlank(setupDaysMin) || isBlank(setupDaysMax) || setupDaysMin === setupDaysMax) {
    return `${single} ${unit(single)}`;
  }
  return `${setupDaysMin} – ${setupDaysMax} days`;
}

// Display grouping of Project requirements; keys are the stable Project Template requirement keys.
export const REQUIREMENT_GROUPS = [
  {
    id: "scientific",
    title: "Scientific / Utility",
    keys: ["requiredTemporalResolution", "minimumCohortRetentionPercent", "criticalUtilityRequirement"],
  },
  {
    id: "operational",
    title: "Operational",
    keys: ["dataAccessDeadline", "maximumSetupTimeDays", "availableBudget", "budgetScope"],
  },
  {
    id: "sharing",
    title: "Sharing Requirements",
    keys: ["analysisDataNeeded", "requiredExternalDeliverables", "sharingModel", "accessPattern"],
  },
];

const STRATEGY_LABELS = { DATA: "Data", CONTEXT: "Context", HYBRID: "Hybrid" };
// One vocabulary for every Project constraint check and plan-level summary.
const PROJECT_CONSTRAINT_LABELS = {
  PASS: "Pass",
  NEEDS_EVALUATION: "Needs evaluation",
  FAIL: "Fail",
};

export const formatStrategy = (strategy) => STRATEGY_LABELS[strategy] || humanizeCode(strategy);
export const formatProjectConstraintResult = (result) =>
  PROJECT_CONSTRAINT_LABELS[result] || humanizeCode(result);

export function projectConstraintColor(result) {
  if (result === "PASS") return "success";
  if (result === "FAIL") return "error";
  return "warning";
}

/** Display prefix of candidate plans (presentation label only, not an identifier). */
export const STRATEGY_PLAN_PREFIX = { DATA: "A", CONTEXT: "B", HYBRID: "C" };

export function formatPlanAction(action) {
  const parameterValues = (action.parameters || [])
    .map((parameter) => (parameter.resolved ? formatOptionValue(parameter.value) : null))
    .filter(Boolean);

  return parameterValues.length > 0
    ? `${action.actionName} (${parameterValues.join(", ")})`
    : action.actionName;
}

export const formatPlanActions = (actions = []) => actions.map(formatPlanAction);

/** Plan-level cost text from the backend aggregation; unknown/partial are never shown as zero. */
export function formatPlanCost(cost) {
  if (cost?.availability === "KNOWN") {
    return formatCostEstimate({ costMin: cost.min, costMax: cost.max, currency: cost.currency });
  }
  return cost?.availability === "PARTIAL" ? "Incomplete estimate" : NOT_AVAILABLE;
}

export function formatPlanSetup(setup) {
  if (setup?.availability === "KNOWN") {
    return formatSetupEstimate({ setupDaysMin: setup.minDays, setupDaysMax: setup.maxDays });
  }
  if (setup?.availability === "PARTIAL") return "Incomplete estimate";
  return setup?.availability === "REQUIRES_ESTIMATE" ? "Requires estimate" : NOT_AVAILABLE;
}
