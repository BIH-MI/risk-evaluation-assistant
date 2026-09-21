import { SHARING_MODEL_OPTIONS } from "screens/projectTemplateConfiguration/AddEditProjectTemplate/projectTemplateFormUtils";
import { formatSharingArrangement } from "utils/projectDisplayLabels";

export const ACTION_TYPES = [
  { value: "DATA_TRANSFORMATION", label: "Data Transformation" },
  { value: "CONTEXT_CONTROL", label: "Context Control" },
];

export const ATTRIBUTE_ROLES = [
  { value: "DIRECT_IDENTIFIER", label: "Direct Identifier" },
  { value: "CANDIDATE_QID", label: "Candidate QID" },
  { value: "SENSITIVE_ATTRIBUTE", label: "Sensitive Attribute" },
  { value: "CANDIDATE_QID_COMBINATION", label: "Candidate QID Combination" },
];

export const DATA_TYPES = [
  { value: "", label: "Any data type" },
  { value: "BOOLEAN", label: "Boolean" },
  { value: "DATE", label: "Date" },
  { value: "DATETIME", label: "Date / Time" },
  { value: "DECIMAL", label: "Decimal" },
  { value: "GEOSPATIAL", label: "Geospatial" },
  { value: "INTEGER", label: "Integer" },
  { value: "STRING", label: "String" },
];

export const SHARING_ARRANGEMENTS = SHARING_MODEL_OPTIONS.map((value) => ({
  value,
  label:
    value === "CONTROLLED_DATA_TRANSFER"
      ? "Controlled Transfer"
      : formatSharingArrangement(value),
}));

export const ESTIMATE_SCOPES = [
  { value: "", label: "Unknown" },
  { value: "SETUP_ONLY", label: "Setup Only" },
  { value: "SINGLE_SHARING_ACTIVITY", label: "Single Sharing Activity" },
  { value: "WHOLE_PROJECT", label: "Whole Project" },
  { value: "ANNUAL_OPERATION", label: "Annual Operation" },
];

export const PARAMETER_CODES = [
  { value: "TARGET_RESOLUTION", label: "Target Resolution" },
  { value: "GENERALIZATION_HIERARCHY", label: "Generalization Hierarchy" },
  { value: "SUPPRESSION_LIMIT", label: "Suppression Limit" },
];

export const TARGET_RESOLUTIONS = [
  { value: "MONTH", label: "Month" },
  { value: "QUARTER", label: "Quarter" },
  { value: "YEAR", label: "Year" },
];

const LEGACY_SHARING_ARRANGEMENT_ALIASES = {
  CONTROLLED_TRANSFER: "CONTROLLED_DATA_TRANSFER",
};

export function emptyActionForm() {
  return {
    id: null,
    code: "",
    name: "",
    description: "",
    actionType: "DATA_TRANSFORMATION",
    active: true,
    applicableSharingArrangements: [],
    implementationDescription: "",
    verificationDescription: "",
    source: "",
    rationale: "",
    estimatedCostMin: "",
    estimatedCostMax: "",
    currency: "",
    estimatedSetupDaysMin: "",
    estimatedSetupDaysMax: "",
    estimateScope: "",
    estimateSource: "",
    estimateAssumptions: "",
    questionMappings: [],
    attributeMappings: [],
    parameterDefinitions: [],
  };
}

export function withClientId(item) {
  return {
    ...item,
    clientId: item.clientId || item.id || `${Date.now()}-${Math.random()}`,
  };
}

export function normalizeActionToForm(action) {
  return {
    ...emptyActionForm(),
    ...action,
    applicableSharingArrangements: normalizeSharingArrangements(
      action.applicableSharingArrangements || []
    ),
    estimatedCostMin: valueOrEmpty(action.estimatedCostMin),
    estimatedCostMax: valueOrEmpty(action.estimatedCostMax),
    estimatedSetupDaysMin: valueOrEmpty(action.estimatedSetupDaysMin),
    estimatedSetupDaysMax: valueOrEmpty(action.estimatedSetupDaysMax),
    estimateScope: action.estimateScope || "",
    questionMappings: (action.questionMappings || []).map((mapping) =>
      withClientId({
        id: mapping.id,
        configurationId: valueOrEmpty(mapping.configurationId),
        configurationName: mapping.configurationName,
        questionCode: mapping.questionCode || "",
        triggerOptionCode: mapping.triggerOptionCode || "",
        projectedOptionCode: mapping.projectedOptionCode || "",
      })
    ),
    attributeMappings: (action.attributeMappings || []).map((mapping) =>
      withClientId({
        id: mapping.id,
        attributeRole: mapping.attributeRole || "CANDIDATE_QID",
        dataType:
          mapping.attributeRole === "CANDIDATE_QID_COMBINATION"
            ? ""
            : valueOrEmpty(mapping.dataType),
      })
    ),
    parameterDefinitions: (action.parameterDefinitions || []).map((parameter) =>
      withClientId({
        id: parameter.id,
        parameterCode: parameter.parameterCode || "TARGET_RESOLUTION",
        allowedValues: normalizeAllowedValues(parameter.allowedValues),
      })
    ),
  };
}

export function buildActionPayload(form) {
  const actionType = form.actionType;
  return {
    code: emptyToNull(form.code),
    name: form.name,
    description: emptyToNull(form.description),
    actionType,
    active: Boolean(form.active),
    applicableSharingArrangements: normalizeSharingArrangements(
      form.applicableSharingArrangements || []
    ),
    implementationDescription: emptyToNull(form.implementationDescription),
    verificationDescription: emptyToNull(form.verificationDescription),
    source: emptyToNull(form.source),
    rationale: emptyToNull(form.rationale),
    estimatedCostMin: numberOrNull(form.estimatedCostMin),
    estimatedCostMax: numberOrNull(form.estimatedCostMax),
    currency: emptyToNull(form.currency),
    estimatedSetupDaysMin: integerOrNull(form.estimatedSetupDaysMin),
    estimatedSetupDaysMax: integerOrNull(form.estimatedSetupDaysMax),
    estimateScope: emptyToNull(form.estimateScope),
    estimateSource: emptyToNull(form.estimateSource),
    estimateAssumptions: emptyToNull(form.estimateAssumptions),
    questionMappings:
      actionType === "CONTEXT_CONTROL"
        ? (form.questionMappings || []).map(
            ({
              clientId,
              configurationName,
              notes,
              ...mapping
            }) => ({
              id: mapping.id,
              configurationId: numberOrNull(mapping.configurationId),
              questionCode: emptyToNull(mapping.questionCode),
              triggerOptionCode: emptyToNull(mapping.triggerOptionCode),
              projectedOptionCode: emptyToNull(mapping.projectedOptionCode),
            })
          )
        : [],
    attributeMappings:
      actionType === "DATA_TRANSFORMATION"
        ? (form.attributeMappings || []).map(({ clientId, notes, ...mapping }) => ({
            id: mapping.id,
            attributeRole: mapping.attributeRole,
            dataType:
              mapping.attributeRole === "CANDIDATE_QID_COMBINATION"
                ? null
                : emptyToNull(mapping.dataType),
          }))
        : [],
    parameterDefinitions:
      actionType === "DATA_TRANSFORMATION"
        ? (form.parameterDefinitions || []).map(({ clientId, ...parameter }) => ({
            id: parameter.id,
            parameterCode: parameter.parameterCode,
            allowedValues:
              parameter.parameterCode === "TARGET_RESOLUTION"
                ? normalizeAllowedValues(parameter.allowedValues)
                : [],
          }))
        : [],
  };
}

export function validateActionForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Name is required.";
  if (!form.actionType) errors.actionType = "Action type is required.";

  validateOperationalEstimates(form, errors);

  if (form.actionType === "DATA_TRANSFORMATION") {
    validateAttributeMappings(form.attributeMappings || [], errors);
    validateParameterDefinitions(form.parameterDefinitions || [], errors);
  }

  if (form.actionType === "CONTEXT_CONTROL") {
    validateQuestionMappings(form.questionMappings || [], errors);
  }

  return errors;
}

export function hasActionFormErrors(errors) {
  return Object.keys(errors || {}).length > 0;
}

export function parameterDefaults(parameterCode) {
  return {
    parameterCode,
    allowedValues:
      parameterCode === "TARGET_RESOLUTION"
        ? TARGET_RESOLUTIONS.map((option) => option.value)
        : [],
  };
}

export function normalizeSharingArrangement(value) {
  return LEGACY_SHARING_ARRANGEMENT_ALIASES[value] || value;
}

function normalizeSharingArrangements(values) {
  return Array.from(
    new Set(
      values
        .map(normalizeSharingArrangement)
        .filter((value) => SHARING_MODEL_OPTIONS.includes(value))
    )
  );
}

function validateOperationalEstimates(form, errors) {
  const costMin = parseOptionalNumber(form.estimatedCostMin);
  const costMax = parseOptionalNumber(form.estimatedCostMax);
  const daysMin = parseOptionalInteger(form.estimatedSetupDaysMin);
  const daysMax = parseOptionalInteger(form.estimatedSetupDaysMax);

  if (costMin.invalid) errors.estimatedCostMin = "Enter a valid number.";
  else if (costMin.present && costMin.value < 0) {
    errors.estimatedCostMin = "Minimum cost must be 0 or greater.";
  }

  if (costMax.invalid) errors.estimatedCostMax = "Enter a valid number.";
  else if (costMax.present && costMax.value < 0) {
    errors.estimatedCostMax = "Maximum cost must be 0 or greater.";
  }

  if (
    costMin.present &&
    !costMin.invalid &&
    costMax.present &&
    !costMax.invalid &&
    costMin.value > costMax.value
  ) {
    errors.estimatedCostMax = "Maximum cost must be at least the minimum cost.";
  }

  if (daysMin.invalid) errors.estimatedSetupDaysMin = "Enter whole days.";
  else if (daysMin.present && daysMin.value < 0) {
    errors.estimatedSetupDaysMin = "Minimum days must be 0 or greater.";
  }

  if (daysMax.invalid) errors.estimatedSetupDaysMax = "Enter whole days.";
  else if (daysMax.present && daysMax.value < 0) {
    errors.estimatedSetupDaysMax = "Maximum days must be 0 or greater.";
  }

  if (
    daysMin.present &&
    !daysMin.invalid &&
    daysMax.present &&
    !daysMax.invalid &&
    daysMin.value > daysMax.value
  ) {
    errors.estimatedSetupDaysMax =
      "Maximum setup time must be at least the minimum setup time.";
  }

  if ((costMin.present || costMax.present) && !form.currency?.trim()) {
    errors.currency = "Currency is required when cost is provided.";
  } else if (form.currency?.trim() && !/^[A-Z]{3}$/.test(form.currency.trim())) {
    errors.currency = "Use a three-letter uppercase code.";
  }

  if (
    (costMin.present || costMax.present || daysMin.present || daysMax.present) &&
    !form.estimateScope
  ) {
    errors.estimateScope = "Estimate scope is required when estimates are provided.";
  }
}

function validateAttributeMappings(mappings, errors) {
  const mappingErrors = mappings.map((mapping) => {
    const rowErrors = {};
    if (!mapping.attributeRole) {
      rowErrors.attributeRole = "Attribute classification is required.";
    }
    return rowErrors;
  });

  if (mappingErrors.some((rowErrors) => Object.keys(rowErrors).length > 0)) {
    errors.attributeMappings = mappingErrors;
  }
}

function validateParameterDefinitions(parameters, errors) {
  const seen = new Set();
  const parameterErrors = parameters.map((parameter) => {
    const rowErrors = {};
    if (!parameter.parameterCode) {
      rowErrors.parameterCode = "Parameter type is required.";
      return rowErrors;
    }
    if (seen.has(parameter.parameterCode)) {
      rowErrors.parameterCode = "Each parameter type can be added only once.";
    }
    seen.add(parameter.parameterCode);
    if (
      parameter.parameterCode === "TARGET_RESOLUTION" &&
      normalizeAllowedValues(parameter.allowedValues).length === 0
    ) {
      rowErrors.allowedValues = "Select at least one allowed resolution.";
    }
    return rowErrors;
  });

  if (parameterErrors.some((rowErrors) => Object.keys(rowErrors).length > 0)) {
    errors.parameterDefinitions = parameterErrors;
  }
}

function validateQuestionMappings(mappings, errors) {
  const mappingErrors = mappings.map((mapping) => {
    const rowErrors = {};
    if (!mapping.configurationId) rowErrors.configurationId = "Risk framework is required.";
    if (!mapping.questionCode) rowErrors.questionCode = "Control question is required.";
    if (!mapping.triggerOptionCode) {
      rowErrors.triggerOptionCode = "Trigger answer is required.";
    }
    if (!mapping.projectedOptionCode) {
      rowErrors.projectedOptionCode = "Verified answer is required.";
    } else if (
      mapping.triggerOptionCode &&
      mapping.triggerOptionCode === mapping.projectedOptionCode
    ) {
      rowErrors.projectedOptionCode =
        "Verified answer must be different from the trigger answer.";
    }
    return rowErrors;
  });

  if (mappingErrors.some((rowErrors) => Object.keys(rowErrors).length > 0)) {
    errors.questionMappings = mappingErrors;
  }
}

function normalizeAllowedValues(values) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim().toUpperCase())
        .filter((value) =>
          TARGET_RESOLUTIONS.some((option) => option.value === value)
        )
    )
  );
}

function valueOrEmpty(value) {
  return value === null || value === undefined ? "" : String(value);
}

function emptyToNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  const number = numberOrNull(value);
  return number === null ? null : Math.trunc(number);
}

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return { present: false, invalid: false, value: null };
  }
  const number = Number(value);
  return {
    present: true,
    invalid: !Number.isFinite(number),
    value: number,
  };
}

function parseOptionalInteger(value) {
  const parsed = parseOptionalNumber(value);
  return {
    ...parsed,
    invalid: parsed.invalid || (parsed.present && !Number.isInteger(parsed.value)),
  };
}
