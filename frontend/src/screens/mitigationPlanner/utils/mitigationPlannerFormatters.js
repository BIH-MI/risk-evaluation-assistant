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

/** "Attribute: a" / "Attributes: a, b"; empty when there are no names. */
export function formatAttributeList(attributeNames = []) {
  if (attributeNames.length === 0) return "";
  const prefix = attributeNames.length === 1 ? "Attribute" : "Attributes";
  return `${prefix}: ${attributeNames.join(", ")}`;
}


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

/** Plan-level cost text from the backend aggregation; unknown/partial are never shown as zero. */
export function formatPlanCost(cost) {
  if (cost?.availability === "KNOWN") {
    return formatCostEstimate({ costMin: cost.min, costMax: cost.max, currency: cost.currency });
  }
  // Missing estimates are unknown, never zero.
  return cost?.availability === "PARTIAL" ? "Incomplete estimate" : "Unknown";
}

export function formatPlanSetup(setup) {
  if (setup?.availability === "KNOWN") {
    return formatSetupEstimate({ setupDaysMin: setup.minDays, setupDaysMax: setup.maxDays });
  }
  if (setup?.availability === "PARTIAL") return "Incomplete estimate";
  return setup?.availability === "REQUIRES_ESTIMATE" ? "Requires estimate" : "Unknown";
}

// Short category names used in counterfactual explanations; the configured name is the fallback.
const CONTEXT_CATEGORY_LABELS = { CONTROLS: "Controls", LIKELIHOOD: "Likelihood" };

const categoryName = (outcome) =>
  CONTEXT_CATEGORY_LABELS[outcome.categoryCode] || outcome.categoryLabel || humanizeCode(outcome.categoryCode);

const responseCount = (count) =>
  `${count} high-risk-trigger response${count === 1 ? " is" : "s are"} still active`;

/**
 * Sentence explaining one context category of a counterfactual result. The reason and counts are
 * backend diagnostics of the projected answers; nothing is inferred here.
 */
export function formatCategoryOutcome(outcome) {
  const name = categoryName(outcome);
  const band = outcome.projectedBand || "—";
  switch (outcome.reason) {
    case "BAND_CHANGED":
      return `${name} changes from ${outcome.baselineBand || "—"} to ${band}.`;
    case "HIGH_RISK_TRIGGERS_REMAIN":
      return `${name} remains ${band} because ${responseCount(outcome.remainingHighRiskTriggerCount)}.`;
    case "SAME_SCORE_BAND":
      return `The projected controls change ${name} answers, but the recalculated score stays in the same configured ${name} band (${band}).`;
    case "NOT_ADDRESSED":
      return `${name} remains ${band}; no selected control changes its responses.`;
    default:
      return "";
  }
}

/**
 * Explanation shown under the matrix when the baseline and plan markers share one cell. Every
 * context category contributes its own backend reason, so a category that stays in the same band
 * and a category held by a remaining high-risk trigger are both explained.
 */
export function formatUnchangedMatrixPosition(outcomes = []) {
  const reasons = outcomes.map(formatCategoryOutcome).filter(Boolean);
  const detail =
    reasons.length > 0
      ? reasons.join(" ")
      : "The recalculated questionnaire score remains within the same configured risk bands.";
  return `Context-risk matrix position unchanged. ${detail}`;
}

// Backend plan status. None of them means safe or approved.
const PLAN_STATUS_LABELS = {
  READY_FOR_REVIEW: "Ready for review",
  EVALUATION_REQUIRED: "Evaluation required",
  INCOMPATIBLE: "Incompatible",
  INVALID: "Invalid",
};

const PLAN_STATUS_HELP = {
  READY_FOR_REVIEW:
    "No open evaluation item remains. The plan still needs human review and approval; it is not a statement that sharing is safe.",
  EVALUATION_REQUIRED: "At least one open item must be evaluated before the plan can be reviewed.",
  INCOMPATIBLE: "A hard Project requirement is not met.",
  INVALID: "The plan cannot be evaluated as configured.",
};

export const formatPlanStatus = (status) => PLAN_STATUS_LABELS[status] || humanizeCode(status);
export const planStatusHelp = (status) => PLAN_STATUS_HELP[status] || "";

export function planStatusColor(status) {
  if (status === "READY_FOR_REVIEW") return "success";
  if (status === "INCOMPATIBLE" || status === "INVALID") return "error";
  return "warning";
}
