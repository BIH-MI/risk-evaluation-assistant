import { formatProjectEnumLabel } from "utils/projectDisplayLabels";

export function flattenRequirements(sections = []) {
  return sections.flatMap((section) => section.requirements || []);
}

export function createEmptyResponseValue(requirement = null) {
  return {
    textValue: "",
    integerValue: "",
    decimalValue: "",
    dateValue: "",
    booleanValue: null,
    selectedValues: [],
    unit: requirement?.unit || "",
  };
}

export function createEmptyProjectForm() {
  return {
    name: "",
    description: "",
    notes: "",
    sharedUsernames: [],
    datasetIds: [],
    recipientIds: [],
    templateVersionId: null,
    responses: {},
  };
}

const DURATION_UNITS = new Set(["DAYS", "WEEKS", "MONTHS", "YEARS"]);

export function isResponseBlank(valueType, response) {
  if (!response) return true;

  switch (valueType) {
    case "TEXT":
    case "LONG_TEXT":
    case "YES_NO_UNKNOWN":
      return !String(response.textValue || "").trim();
    case "INTEGER":
    case "DURATION":
      return (
        response.integerValue === "" ||
        response.integerValue === null ||
        response.integerValue === undefined
      );
    case "DECIMAL":
    case "MONEY":
      return (
        response.decimalValue === "" ||
        response.decimalValue === null ||
        response.decimalValue === undefined
      );
    case "DATE":
      return !response.dateValue;
    case "YES_NO":
      return response.booleanValue === null || response.booleanValue === undefined;
    case "SINGLE_SELECT":
    case "MULTI_SELECT":
      return !(response.selectedValues && response.selectedValues.length > 0);
    default:
      return true;
  }
}

/**
 * Parses an admin-configured defaultValue/fixedValue string (as stored on a
 * Project Template requirement) into the same typed draft shape a user's
 * answer uses, mirroring the backend's own parsing in ProjectService so a
 * fixed/defaulted field previews correctly before it's ever submitted.
 */
export function parseConfiguredValueToResponse(requirement, raw) {
  const response = createEmptyResponseValue();
  if (!raw) return response;

  const trimmed = String(raw).trim();

  switch (requirement.valueType) {
    case "TEXT":
    case "LONG_TEXT":
      response.textValue = trimmed;
      break;
    case "INTEGER":
      response.integerValue = trimmed;
      break;
    case "DECIMAL":
    case "MONEY":
      response.decimalValue = trimmed;
      response.unit = requirement.unit || "";
      break;
    case "DATE":
      response.dateValue = trimmed;
      break;
    case "YES_NO": {
      const upper = trimmed.toUpperCase();
      response.booleanValue = upper === "YES" || upper === "TRUE";
      break;
    }
    case "YES_NO_UNKNOWN":
      response.textValue = trimmed.toUpperCase();
      break;
    case "SINGLE_SELECT":
    case "MULTI_SELECT":
      response.selectedValues = trimmed
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      break;
    case "DURATION": {
      const parts = trimmed.split(/\s+/);
      response.integerValue = parts[0] || "";
      response.unit = parts[1] || requirement.unit || "";
      break;
    }
    default:
      break;
  }

  return response;
}

function responseFromExisting(existing, requirement) {
  return {
    textValue: existing.textValue || "",
    integerValue:
      existing.integerValue === null || existing.integerValue === undefined
        ? ""
        : String(existing.integerValue),
    decimalValue:
      existing.decimalValue === null || existing.decimalValue === undefined
        ? ""
        : String(existing.decimalValue),
    dateValue: existing.dateValue || "",
    booleanValue: existing.booleanValue === undefined ? null : existing.booleanValue,
    selectedValues: existing.selectedValues || [],
    unit: existing.unit || requirement.unit || "",
  };
}

/**
 * Builds the draft responses map (keyed by requirementId) for a set of
 * template sections, seeding each requirement from an existing saved answer,
 * else its fixed/default value, else an empty draft.
 */
export function buildInitialResponses(sections, existingResponses = []) {
  const existingByRequirementId = new Map(
    (existingResponses || []).map((response) => [String(response.requirementId), response])
  );
  const responses = {};

  flattenRequirements(sections).forEach((requirement) => {
    const existing = existingByRequirementId.get(String(requirement.id));
    if (existing) {
      responses[requirement.id] = responseFromExisting(existing, requirement);
    } else if (requirement.fixedValue) {
      responses[requirement.id] = parseConfiguredValueToResponse(requirement, requirement.fixedValue);
    } else if (requirement.defaultValue) {
      responses[requirement.id] = parseConfiguredValueToResponse(requirement, requirement.defaultValue);
    } else {
      responses[requirement.id] = createEmptyResponseValue(requirement);
    }
  });

  return responses;
}

export function normalizeProject(project) {
  if (!project) return createEmptyProjectForm();

  const sections = project.projectTemplate?.sections || [];

  return {
    name: project.name || "",
    description: project.description || "",
    notes: project.notes || "",
    sharedUsernames: project.sharedUsernames || [],
    datasetIds: project.datasetIds || [],
    recipientIds: project.recipientIds || [],
    templateVersionId: project.templateVersionId || null,
    responses: buildInitialResponses(sections, project.requirementResponses || []),
  };
}

export function validateProjectForm(values, sections, t) {
  const errors = { name: "", template: "", responses: {} };

  if (!values.name.trim()) {
    errors.name = t("projects.form.nameRequired");
  }
  if (!values.templateVersionId) {
    errors.template = t("projects.form.templateRequired");
  }

  flattenRequirements(sections).forEach((requirement) => {
    const response = values.responses[requirement.id];
    const error = validateRequirementResponse(requirement, response, t);
    if (error) {
      errors.responses[requirement.id] = error;
    }
  });

  return errors;
}

function validateRequirementResponse(requirement, response, t) {
  if (requirement.fixedValue) return "";

  if (isResponseBlank(requirement.valueType, response)) {
    if (!requirement.required) return "";
    if (requirement.stableKey === "analysisDataNeeded") {
      return t("projects.form.analysisDataNeededRequired");
    }
    if (requirement.stableKey === "requiredExternalDeliverables") {
      return t("projects.form.externalDeliverablesRequired");
    }
    if (requirement.stableKey === "scientificObjective") {
      return t("projects.form.scientificObjectiveRequired");
    }
    return t("projects.form.requirementRequired", { label: requirement.label });
  }

  switch (requirement.valueType) {
    case "INTEGER":
    case "DURATION":
      return validateNumberResponse(requirement, Number(response.integerValue), true, t, response);
    case "DECIMAL":
    case "MONEY":
      return validateNumberResponse(requirement, Number(response.decimalValue), false, t, response);
    case "SINGLE_SELECT":
      if ((response.selectedValues || []).length !== 1) {
        return t("projects.form.singleSelectRequired", { label: requirement.label });
      }
      return validateSelectedValues(requirement, response.selectedValues || [], t);
    case "MULTI_SELECT":
      return validateSelectedValues(requirement, response.selectedValues || [], t);
    case "YES_NO_UNKNOWN":
      return ["YES", "NO", "UNKNOWN"].includes(response.textValue)
        ? ""
        : t("projects.form.yesNoUnknownInvalid", { label: requirement.label });
    default:
      return "";
  }
}

function validateNumberResponse(requirement, value, integer, t, response) {
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    return t("projects.form.numberInvalid", { label: requirement.label });
  }

  if (requirement.valueType === "DURATION" && !DURATION_UNITS.has(response.unit || requirement.unit || "")) {
    return t("projects.form.durationUnitInvalid", { label: requirement.label });
  }

  const min = requirement.minValue === null || requirement.minValue === undefined ? null : Number(requirement.minValue);
  const max = requirement.maxValue === null || requirement.maxValue === undefined ? null : Number(requirement.maxValue);
  if (min !== null && value < min) {
    return requirement.stableKey === "minimumCohortRetentionPercent"
      ? t("projects.form.minimumCohortRetentionRange")
      : t("projects.form.numberBelowMin", { label: requirement.label, min });
  }
  if (max !== null && value > max) {
    return requirement.stableKey === "minimumCohortRetentionPercent"
      ? t("projects.form.minimumCohortRetentionRange")
      : t("projects.form.numberAboveMax", { label: requirement.label, max });
  }
  return "";
}

function validateSelectedValues(requirement, selectedValues, t) {
  const allowed = new Set(requirement.allowedValues || []);
  const invalid = selectedValues.find((value) => !allowed.has(value));
  return invalid
    ? t("projects.form.selectionInvalid", { label: requirement.label })
    : "";
}

export function hasProjectFormErrors(errors) {
  return Boolean(errors.name || errors.template) || Object.keys(errors.responses).length > 0;
}

export function buildProjectPayload(values, sections) {
  const requirementResponses = [];

  flattenRequirements(sections).forEach((requirement) => {
    // Fixed values are enforced server-side regardless of what's submitted.
    if (requirement.fixedValue) return;
    if (
      requirement.stableKey === "budgetScope" &&
      !hasNonBlankResponseForKey(sections, values.responses, "availableBudget")
    ) {
      return;
    }

    const response = values.responses[requirement.id];
    if (!response || isResponseBlank(requirement.valueType, response)) return;

    const payload = { requirementId: requirement.id, requirementKey: requirement.stableKey };

    switch (requirement.valueType) {
      case "TEXT":
      case "LONG_TEXT":
        payload.textValue = response.textValue.trim();
        break;
      case "YES_NO_UNKNOWN":
        payload.textValue = response.textValue;
        break;
      case "INTEGER":
      case "DURATION":
        payload.integerValue = Number(response.integerValue);
        if (response.unit) payload.unit = response.unit.trim();
        break;
      case "DECIMAL":
      case "MONEY":
        payload.decimalValue = Number(response.decimalValue);
        if (response.unit) payload.unit = response.unit.trim();
        break;
      case "DATE":
        payload.dateValue = response.dateValue;
        break;
      case "YES_NO":
        payload.booleanValue = Boolean(response.booleanValue);
        break;
      case "SINGLE_SELECT":
      case "MULTI_SELECT":
        payload.selectedValues = response.selectedValues;
        break;
      default:
        break;
    }

    requirementResponses.push(payload);
  });

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    notes: values.notes.trim(),
    sharedUsernames: values.sharedUsernames,
    templateVersionId: values.templateVersionId,
    datasetIds: values.datasetIds.map(Number),
    recipientIds: values.recipientIds.map(Number),
    requirementResponses,
  };
}

export function hasNonBlankResponseForKey(sections, responses, stableKey) {
  const requirement = flattenRequirements(sections).find(
    (item) => item.stableKey === stableKey
  );
  if (!requirement) return false;
  return !isResponseBlank(requirement.valueType, responses[requirement.id]);
}

/**
 * Extracts the response value(s) for a single requirement in the same
 * comparable shape a Project Template section's `visibleWhenValues`
 * condition is stored in (uppercase strings), regardless of the
 * requirement's underlying value type.
 */
function currentResponseValues(requirement, response) {
  if (!response) return [];

  switch (requirement.valueType) {
    case "SINGLE_SELECT":
    case "MULTI_SELECT":
      return response.selectedValues || [];
    case "YES_NO":
      return response.booleanValue === null || response.booleanValue === undefined
        ? []
        : [response.booleanValue ? "YES" : "NO"];
    case "YES_NO_UNKNOWN":
      return response.textValue ? [response.textValue] : [];
    default:
      return [];
  }
}

/**
 * Filters out any section whose display condition isn't currently satisfied
 * by the draft responses, so conditional sections (e.g. "Analysis
 * Environment Requirements") only render/validate/submit when relevant.
 * Unresolvable conditions (malformed template data) fail open, matching the
 * backend's own evaluation in ProjectService.
 */
export function getVisibleSections(sections, responses) {
  const requirementsByKey = new Map(
    flattenRequirements(sections).map((requirement) => [requirement.stableKey, requirement])
  );

  return (sections || []).filter((section) => {
    if (!section.dependsOnRequirementKey) return true;

    const dependency = requirementsByKey.get(section.dependsOnRequirementKey);
    if (!dependency) return true;

    const currentValues = currentResponseValues(dependency, responses[dependency.id]);
    return currentValues.some((value) => (section.visibleWhenValues || []).includes(value));
  });
}

export function formatOptionLabel(value) {
  return formatProjectEnumLabel(value);
}
