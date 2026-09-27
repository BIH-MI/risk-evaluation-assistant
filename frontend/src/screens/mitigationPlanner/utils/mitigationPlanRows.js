import {
  formatAttributeRole,
  formatOptionValue,
  formatParameterLabel,
} from "./mitigationPlannerFormatters";

// Risk factor priority explains why a current assessment answer or evidence item is shown here.
const PRIORITY_RANK = {
  CRITICAL: 0,
  HIGH: 1,
  OPTIONAL_IMPROVEMENT: 2,
  NO_ACTION_REQUIRED: 3,
};

const EVIDENCE_SOURCES = new Set(["DATASET_ATTRIBUTE", "QID_COMBINATION"]);

export const isDatasetEvidenceDriver = (driver) => EVIDENCE_SOURCES.has(driver?.source);

/**
 * One parameter per parameterCode. The backend already returns unique definitions; this is a
 * defensive merge so a duplicated definition can never render the same parameter twice.
 */
export function dedupeParameters(parameters = []) {
  const byCode = new Map();
  parameters.forEach((parameter) => {
    const existing = byCode.get(parameter.parameterCode);
    if (!existing) {
      byCode.set(parameter.parameterCode, {
        ...parameter,
        allowedValues: dedupeValues(parameter.allowedValues),
      });
      return;
    }
    existing.allowedValues = dedupeValues([
      ...existing.allowedValues,
      ...(parameter.allowedValues || []),
    ]);
    existing.compatibility = existing.compatibility || parameter.compatibility;
    existing.compatibilityReason =
      existing.compatibilityReason || parameter.compatibilityReason;
  });
  return [...byCode.values()];
}

function dedupeValues(values = []) {
  const byValue = new Map();
  values.forEach((option) => {
    const existing = byValue.get(option.value);
    if (!existing || (!existing.compatibility && option.compatibility)) {
      byValue.set(option.value, option);
    }
  });
  return [...byValue.values()];
}

/**
 * "Preferred" is only a local, Project-compatible parameter choice (the first, i.e. least
 * coarsened, compatible value). It makes no claim of global optimality.
 */
export function preferredValue(parameter) {
  const evaluated = (parameter.allowedValues || []).some((option) => option.compatibility);
  if (!evaluated) return null;
  return (parameter.allowedValues || []).find((option) => option.compatibility === "COMPATIBLE")?.value || null;
}

export const isUnresolvableParameter = (parameter) => (parameter.allowedValues || []).length === 0;

/**
 * Action rows of the planner: one row per catalogue action, even when the action addresses several
 * risk factors. The addressed drivers are attached for traceability only.
 */
export function buildActionRows(overview) {
  const dataDrivers = overview?.riskDrivers?.dataDrivers || [];
  const contextDrivers = overview?.riskDrivers?.contextDrivers || [];
  const toRow = (group, drivers) => (opportunity) => {
    const addressedIds = new Set(opportunity.addressedRiskDriverIds || []);
    const addressedRiskDrivers = sortDrivers(
      drivers.filter(
        (driver) =>
          addressedIds.has(driver.id) ||
          (driver.matchedMitigationActionIds || []).includes(opportunity.actionId)
      )
    );
    return {
      ...opportunity,
      group,
      parameters: dedupeParameters(opportunity.parameters),
      addressedRiskDrivers,
      priority: addressedRiskDrivers[0]?.priority || null,
    };
  };
  return sortRows([
    ...(overview?.dataOpportunities?.opportunities || []).map(toRow("DATA", dataDrivers)),
    ...(overview?.contextOpportunities?.opportunities || []).map(toRow("CONTEXT", contextDrivers)),
  ]);
}

export function driverPriorityRank(priority) {
  return PRIORITY_RANK[priority] ?? 99;
}

function sortDrivers(drivers) {
  return [...drivers].sort((left, right) => driverPriorityRank(left.priority) - driverPriorityRank(right.priority));
}

// Actions addressing critical risk factors first; the catalogue order is kept otherwise.
function sortRows(rows) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (left, right) =>
        driverPriorityRank(left.row.priority) - driverPriorityRank(right.row.priority) || left.index - right.index
    )
    .map(({ row }) => row);
}

// Grouping predicates use stable source/category codes, never display labels.
export const isImpactDriver = (driver) => driver?.source === "DATASET_QUESTION";
export const isControlsDriver = (driver) =>
  driver?.source === "RECIPIENT_QUESTION" && driver?.categoryCode === "CONTROLS";
export const isLikelihoodDriver = (driver) =>
  driver?.source === "RECIPIENT_QUESTION" && driver?.categoryCode === "LIKELIHOOD";

/**
 * Risk factors shown in the planner: high-risk triggers (Critical) first, then negative answers
 * (High). Neutral and positive answers are not mitigation needs in this milestone.
 */
export function visibleRiskFactors(drivers = []) {
  return sortDrivers(drivers.filter((driver) => driver.priority === "CRITICAL" || driver.priority === "HIGH"));
}

export function driverTitle(driver) {
  if (!driver) return "";
  if (isDatasetEvidenceDriver(driver)) {
    return (driver.attributeNames || []).join(" + ");
  }
  return driver.questionText || driver.questionCode || "";
}

/** Current answer (questionnaire) or classification (Dataset Assessment evidence). */
export function driverCurrentState(driver) {
  if (isDatasetEvidenceDriver(driver)) {
    return formatAttributeRole(driver.attributeRole);
  }
  return driver.selectedOptionText || "—";
}


/** Plain-text lines describing the selected parameters of a planned action. */
export function planActionParameterLines(action) {
  return (action.parameters || []).map((parameter) =>
    parameter.resolved
      ? `${formatParameterLabel(parameter.parameterCode)}: ${formatOptionValue(parameter.value)}`
      : `${formatParameterLabel(parameter.parameterCode)}: To be determined during transformation evaluation`
  );
}
