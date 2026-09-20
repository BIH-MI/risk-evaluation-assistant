import i18n from "i18n";

export const VALUE_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "INTEGER",
  "DECIMAL",
  "DATE",
  "YES_NO",
  "YES_NO_UNKNOWN",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "MONEY",
  "DURATION",
];

export const CONSTRAINT_TYPES = ["INFORMATIONAL", "PREFERENCE", "HARD_CONSTRAINT"];

const SELECTABLE_VALUE_TYPES = new Set(["SINGLE_SELECT", "MULTI_SELECT"]);
const NUMERIC_VALUE_TYPES = new Set(["INTEGER", "DECIMAL", "MONEY"]);
const DURATION_UNITS = new Set(["DAYS", "WEEKS", "MONTHS", "YEARS"]);
export const CORE_REQUIREMENT_KEYS = [
  "scientificObjective",
  "analysisDataNeeded",
  "requiredExternalDeliverables",
  "sharingModel",
];
const CORE_REQUIREMENT_KEY_SET = new Set(CORE_REQUIREMENT_KEYS);
const CORE_SECTION_TITLES = [
  "Project Overview",
  "Data Sharing Goal",
  "Utility Requirements",
  "Timeline & Resources",
];
const CORE_SECTION_TITLE_SET = new Set(
  CORE_SECTION_TITLES.map((title) => title.toLowerCase())
);
const FIXED_SECTION_TITLES = [
  ...CORE_SECTION_TITLES,
  "Analysis Environment",
];
const FIXED_SECTION_TITLE_SET = new Set(
  FIXED_SECTION_TITLES.map((title) => title.toLowerCase())
);
const SHARING_MODEL_OPTIONS = [
  "PUBLIC_RELEASE",
  "CONTROLLED_DATA_TRANSFER",
  "SECURE_REMOTE_ANALYSIS",
  "MANAGED_QUERY",
];
const CONDITION_SUPPORTED_VALUE_TYPES = new Set([
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "YES_NO",
  "YES_NO_UNKNOWN",
]);

export function isSelectableValueType(valueType) {
  return SELECTABLE_VALUE_TYPES.has(valueType);
}

export function isNumericValueType(valueType) {
  return NUMERIC_VALUE_TYPES.has(valueType);
}

export function isConditionSupportedValueType(valueType) {
  return CONDITION_SUPPORTED_VALUE_TYPES.has(valueType);
}

export function isCoreRequirementKey(stableKey) {
  return CORE_REQUIREMENT_KEY_SET.has(String(stableKey || "").trim());
}

export function isCoreSectionTitle(title) {
  return CORE_SECTION_TITLE_SET.has(String(title || "").trim().toLowerCase());
}

export function isFixedSectionTitle(title) {
  return FIXED_SECTION_TITLE_SET.has(String(title || "").trim().toLowerCase());
}

/**
 * The values an admin may pick from when configuring a section's display
 * condition against a given (earlier) requirement: that requirement's own
 * allowed values for SINGLE_SELECT/MULTI_SELECT, or YES/NO(/UNKNOWN) for the
 * boolean-like types.
 */
export function getConditionValueOptions(requirement) {
  if (!requirement) return [];
  if (requirement.valueType === "SINGLE_SELECT" || requirement.valueType === "MULTI_SELECT") {
    return requirement.allowedValuesText
      ? requirement.allowedValuesText.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
  }
  if (requirement.valueType === "YES_NO") {
    return ["YES", "NO"];
  }
  if (requirement.valueType === "YES_NO_UNKNOWN") {
    return ["YES", "NO", "UNKNOWN"];
  }
  return [];
}

/**
 * Requirements a section at `sectionIndex` may declare a display condition
 * against: only requirements defined in a strictly earlier section (which
 * structurally forbids circular dependencies), and only of a value type a
 * simple value-match condition can evaluate.
 */
export function getEligibleDependencyRequirements(sections, sectionIndex) {
  return sections
    .slice(0, sectionIndex)
    .flatMap((section) => section.requirements)
    .filter((requirement) => (
      isConditionSupportedValueType(requirement.valueType) &&
      Boolean(getRequirementReferenceKey(requirement))
    ));
}

/**
 * Client IDs are used only to keep unsaved section/requirement rows stable
 * across React renders and are never serialized to the backend.
 */
export function createClientId(prefix) {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Mirrors the backend's label-to-stable-key normalization so the admin form
 * can validate labels and configure conditions for unsaved requirements.
 * The backend remains authoritative and generates persisted keys.
 */
export function generateStableKeyFromLabel(label) {
  const normalized = String(label || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const words = normalized
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return "";

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

export function getRequirementReferenceKey(requirement) {
  return String(requirement?.stableKey || "").trim() || generateStableKeyFromLabel(requirement?.label);
}

export function createEmptyRequirementEntry() {
  return {
    clientId: createClientId("requirement"),
    id: null,
    stableKey: "",
    label: "",
    helpText: "",
    valueType: "TEXT",
    required: false,
    constraintType: "INFORMATIONAL",
    defaultValue: "",
    fixedValue: "",
    unit: "",
    minValue: "",
    maxValue: "",
    allowedValuesText: "",
    source: "",
    rationale: "",
  };
}

export function createEmptySectionEntry() {
  return {
    clientId: createClientId("section"),
    id: null,
    title: "",
    helpText: "",
    dependsOnRequirementKey: "",
    visibleWhenValues: [],
    requirements: [createEmptyRequirementEntry()],
  };
}

function createRequirementEntry(overrides = {}) {
  return {
    ...createEmptyRequirementEntry(),
    ...overrides,
  };
}

function createSectionEntry({ title, helpText, dependsOnRequirementKey = "", visibleWhenValues = [], requirements }) {
  return {
    clientId: createClientId("section"),
    id: null,
    title,
    helpText,
    dependsOnRequirementKey,
    visibleWhenValues,
    requirements,
  };
}

function createCoreProjectTemplateSections() {
  return [
    createSectionEntry({
      title: "Project Overview",
      helpText:
        "High-level metadata describing the research project and its scientific purpose. This information provides project context and provenance; it does not affect the privacy-risk score.",
      requirements: [
        createRequirementEntry({
          stableKey: "projectLead",
          label: "Project Lead / Principal Investigator",
          helpText:
            "The person responsible for the scientific direction of the project. Optional, but useful for project ownership, reporting and later review.",
          valueType: "TEXT",
        }),
        createRequirementEntry({
          stableKey: "studyProtocolReference",
          label: "Study / Protocol Reference",
          helpText:
            "Reference to the study protocol, analysis plan, registration or other project documentation. Use this when an authoritative project document exists.",
          valueType: "TEXT",
        }),
        createRequirementEntry({
          stableKey: "scientificObjective",
          label: "Scientific Objective",
          helpText:
            "Briefly describe the research question or intended use of the data. This gives context to later mitigation decisions but is not used as a privacy-risk score.",
          valueType: "LONG_TEXT",
          required: true,
        }),
        createRequirementEntry({
          stableKey: "projectDuration",
          label: "Expected Project Duration",
          helpText:
            "Expected period during which the project will actively use the data. This may later help compare one-time and recurring access arrangements.",
          valueType: "DURATION",
          unit: "MONTHS",
        }),
      ],
    }),
    createSectionEntry({
      title: "Data Sharing Goal",
      helpText:
        "Define what form of data is needed for the analysis, what must ultimately be deliverable outside the access environment, and how access to the data will be provided.",
      requirements: [
        createRequirementEntry({
          stableKey: "analysisDataNeeded",
          label: "Data Needed for Analysis",
          helpText:
            "Select the least processed form of data needed to perform the planned analysis. Choose Individual-level Data when record-level analysis is necessary, Aggregate Data when summaries are sufficient, or Synthetic Data when an appropriate synthetic representation can support the analysis.",
          valueType: "MULTI_SELECT",
          required: true,
          constraintType: "HARD_CONSTRAINT",
          allowedValuesText: "INDIVIDUAL_LEVEL_DATA, AGGREGATE_DATA, SYNTHETIC_DATA",
        }),
        createRequirementEntry({
          stableKey: "requiredExternalDeliverables",
          label: "Required External Deliverable",
          helpText:
            "Select what must ultimately be available outside the access environment. In secure environments, individual-level data may be analysed inside the environment while only aggregate results, tables, reports or code are exported.",
          valueType: "MULTI_SELECT",
          required: true,
          constraintType: "HARD_CONSTRAINT",
          allowedValuesText: "AGGREGATE_RESULTS, TABLES_FIGURES, REPORT, CODE",
        }),
        createRequirementEntry({
          stableKey: "sharingModel",
          label: "Sharing Model",
          helpText:
            "The sharing model defines how access to the data is provided. It is determined by the selected Project Template and will later be used when evaluating mitigation options.",
          valueType: "SINGLE_SELECT",
          required: true,
          constraintType: "HARD_CONSTRAINT",
          allowedValuesText: SHARING_MODEL_OPTIONS.join(", "),
          fixedValue: "SECURE_REMOTE_ANALYSIS",
        }),
        createRequirementEntry({
          stableKey: "accessPattern",
          label: "Access Pattern",
          helpText:
            "How often will access or refreshed data be needed? One Time means a single delivery or bounded access period. Recurring means data/access is periodically renewed or refreshed. Continuous means ongoing access or continuously updated data. This can later affect operational effort, repeated anonymization and re-evaluation.",
          valueType: "SINGLE_SELECT",
          constraintType: "HARD_CONSTRAINT",
          allowedValuesText: "ONE_TIME, RECURRING, CONTINUOUS",
        }),
      ],
    }),
    createSectionEntry({
      title: "Utility Requirements",
      helpText:
        "Optional scientific constraints describing the minimum usefulness that a mitigation strategy should preserve. Complete only the requirements that matter for the planned analysis.",
      requirements: [
        createRequirementEntry({
          stableKey: "requiredTemporalResolution",
          label: "Required Temporal Resolution",
          helpText:
            "Minimum temporal detail that must remain usable after mitigation. For example, Month means exact dates may be generalized to month, but reducing them to Year would not satisfy this Project requirement. Leave blank if temporal precision is not important.",
          valueType: "SINGLE_SELECT",
          constraintType: "PREFERENCE",
          allowedValuesText: "DAY, MONTH, QUARTER, YEAR, NOT_REQUIRED",
        }),
        createRequirementEntry({
          stableKey: "minimumCohortRetentionPercent",
          label: "Minimum Cohort Retention",
          helpText:
            "Minimum percentage of participants that must remain after suppression or participant-level exclusion. For example, 95% means a mitigation strategy may remove at most 5% of participants. Leave blank when no retention target is defined.",
          valueType: "DECIMAL",
          constraintType: "PREFERENCE",
          unit: "PERCENT",
          minValue: "0",
          maxValue: "100",
        }),
        createRequirementEntry({
          stableKey: "criticalUtilityRequirement",
          label: "Critical Utility Requirement",
          helpText:
            "Optional scientific requirement not represented by the structured fields above, for example: 'Age and outcome variables must remain suitable for the primary regression analysis.' This is currently used for assessor review and should not be automatically converted into a numerical utility score.",
          valueType: "LONG_TEXT",
          constraintType: "PREFERENCE",
        }),
      ],
    }),
    createSectionEntry({
      title: "Analysis Environment",
      helpText:
        "Technical capabilities required to perform the analysis inside a secure or managed environment. These fields describe what the research workflow needs; they do not assess the security of the environment.",
      dependsOnRequirementKey: "sharingModel",
      visibleWhenValues: ["SECURE_REMOTE_ANALYSIS", "MANAGED_QUERY"],
      requirements: [
        createRequirementEntry({
          stableKey: "requiredAnalysisSoftware",
          label: "Required Analysis Software",
          helpText:
            "Software or statistical tools that must be available in the analysis environment, for example R, Python or specific approved applications.",
          valueType: "TEXT",
          constraintType: "HARD_CONSTRAINT",
        }),
        createRequirementEntry({
          stableKey: "requiredComputeCapability",
          label: "Required Compute Capability",
          helpText:
            "Minimum compute capability needed for the analysis, such as standard CPU, high-memory processing or GPU support.",
          valueType: "SINGLE_SELECT",
          constraintType: "HARD_CONSTRAINT",
          allowedValuesText: "STANDARD_CPU, HIGH_MEMORY, GPU, OTHER",
        }),
      ],
    }),
    createSectionEntry({
      title: "Timeline & Resources",
      helpText:
        "Optional operational constraints that may affect which mitigation strategy can be implemented. These values can later be used to compare setup time and implementation cost between feasible plans.",
      requirements: [
        createRequirementEntry({
          stableKey: "dataAccessDeadline",
          label: "Required Data Access Date",
          helpText:
            "Date by which usable access to the data or analysis environment is required. This is the access-readiness deadline, not the deadline for publishing final research results.",
          valueType: "DATE",
          constraintType: "HARD_CONSTRAINT",
        }),
        createRequirementEntry({
          stableKey: "maximumSetupTimeDays",
          label: "Maximum Acceptable Setup Time",
          helpText:
            "Maximum amount of time the Project can tolerate for establishing the selected data-sharing arrangement. Leave blank if there is no known setup-time limit.",
          valueType: "INTEGER",
          constraintType: "HARD_CONSTRAINT",
          unit: "DAYS",
          minValue: "0",
        }),
        createRequirementEntry({
          stableKey: "availableBudget",
          label: "Available Implementation Budget",
          helpText:
            "Budget available for implementing the data-sharing or mitigation strategy. This refers to Project resources, not the recipient's financial capacity.",
          valueType: "MONEY",
          constraintType: "HARD_CONSTRAINT",
        }),
        createRequirementEntry({
          stableKey: "budgetScope",
          label: "Budget Scope",
          helpText:
            "Defines what the budget covers, for example initial setup, one sharing activity, the entire Project, or one year of operation.",
          valueType: "SINGLE_SELECT",
          allowedValuesText: "SETUP_ONLY, SINGLE_SHARING_ACTIVITY, WHOLE_PROJECT, ANNUAL_OPERATION",
        }),
      ],
    }),
  ];
}

export function createEmptyProjectTemplateForm() {
  return {
    id: null,
    name: "",
    description: "",
    active: true,
    defaultTemplate: false,
    versionId: null,
    versionNumber: null,
    sections: createCoreProjectTemplateSections(),
  };
}

export function normalizeProjectTemplateToForm(template) {
  return {
    id: template.id,
    name: template.name || "",
    description: template.description || "",
    active: Boolean(template.active),
    defaultTemplate: Boolean(template.defaultTemplate),
    versionId: template.versionId ?? null,
    versionNumber: template.versionNumber ?? null,
    sections: (template.sections && template.sections.length > 0
      ? template.sections
      : []
    ).map((section) => ({
      clientId: createClientId("section"),
      id: section.id,
      title: section.title || "",
      helpText: section.helpText || "",
      dependsOnRequirementKey: section.dependsOnRequirementKey || "",
      visibleWhenValues: section.visibleWhenValues || [],
      requirements: (section.requirements || []).map((requirement) => ({
        clientId: createClientId("requirement"),
        id: requirement.id,
        stableKey: requirement.stableKey || "",
        label: requirement.label || "",
        helpText: requirement.helpText || "",
        valueType: requirement.valueType || "TEXT",
        required: Boolean(requirement.required),
        constraintType: requirement.constraintType || "INFORMATIONAL",
        defaultValue: requirement.defaultValue || "",
        fixedValue: requirement.fixedValue || "",
        unit: requirement.unit || "",
        minValue:
          requirement.minValue === null || requirement.minValue === undefined
            ? ""
            : String(requirement.minValue),
        maxValue:
          requirement.maxValue === null || requirement.maxValue === undefined
            ? ""
            : String(requirement.maxValue),
        allowedValuesText: (requirement.allowedValues || []).join(", "),
        source: requirement.source || "",
        rationale: requirement.rationale || "",
      })),
    })),
  };
}

function parseAllowedValues(text) {
  return String(text || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function splitConfiguredValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateConfiguredValue(requirement, fieldName, allowedValues) {
  const value = String(requirement[fieldName] || "").trim();
  if (!value) return "";

  const fieldLabel = i18n.t(`projectTemplateConfiguration.requirement.${fieldName}`);

  try {
    switch (requirement.valueType) {
      case "INTEGER": {
        const number = Number(value);
        if (!Number.isInteger(number)) {
          return i18n.t("projectTemplateConfiguration.errors.configuredInteger", { field: fieldLabel });
        }
        return validateConfiguredNumber(requirement, fieldLabel, number);
      }
      case "DECIMAL":
      case "MONEY": {
        const number = Number(value);
        if (!Number.isFinite(number)) {
          return i18n.t("projectTemplateConfiguration.errors.configuredNumber", { field: fieldLabel });
        }
        return validateConfiguredNumber(requirement, fieldLabel, number);
      }
      case "DATE":
        if (Number.isNaN(Date.parse(value))) {
          return i18n.t("projectTemplateConfiguration.errors.configuredDate", { field: fieldLabel });
        }
        return "";
      case "YES_NO": {
        const normalized = value.toUpperCase();
        return ["YES", "NO", "TRUE", "FALSE"].includes(normalized)
          ? ""
          : i18n.t("projectTemplateConfiguration.errors.configuredYesNo", { field: fieldLabel });
      }
      case "YES_NO_UNKNOWN": {
        const normalized = value.toUpperCase();
        return ["YES", "NO", "UNKNOWN"].includes(normalized)
          ? ""
          : i18n.t("projectTemplateConfiguration.errors.configuredYesNoUnknown", { field: fieldLabel });
      }
      case "SINGLE_SELECT":
      case "MULTI_SELECT": {
        const allowed = new Set(allowedValues);
        const configuredValues = splitConfiguredValues(value);
        if (requirement.valueType === "SINGLE_SELECT" && configuredValues.length !== 1) {
          return i18n.t("projectTemplateConfiguration.errors.configuredSingleSelection", { field: fieldLabel });
        }
        const invalid = configuredValues.find((item) => !allowed.has(item));
        return invalid
          ? i18n.t("projectTemplateConfiguration.errors.configuredSelection", {
              field: fieldLabel,
              value: invalid,
            })
          : "";
      }
      case "DURATION": {
        const [amount, unit] = value.split(/\s+/, 2);
        const number = Number(amount);
        if (!Number.isInteger(number) || number < 0) {
          return i18n.t("projectTemplateConfiguration.errors.configuredDuration", { field: fieldLabel });
        }
        if (unit && !DURATION_UNITS.has(unit)) {
          return i18n.t("projectTemplateConfiguration.errors.configuredDurationUnit", { field: fieldLabel });
        }
        return "";
      }
      default:
        return "";
    }
  } catch (_error) {
    return i18n.t("projectTemplateConfiguration.errors.configuredValueInvalid", { field: fieldLabel });
  }
}

function validateConfiguredNumber(requirement, fieldLabel, number) {
  if (!Number.isFinite(number)) {
    return i18n.t("projectTemplateConfiguration.errors.configuredNumber", { field: fieldLabel });
  }

  const min = requirement.minValue === "" ? null : Number(requirement.minValue);
  const max = requirement.maxValue === "" ? null : Number(requirement.maxValue);
  if (min !== null && number < min) {
    return i18n.t("projectTemplateConfiguration.errors.configuredBelowMin", { field: fieldLabel, min });
  }
  if (max !== null && number > max) {
    return i18n.t("projectTemplateConfiguration.errors.configuredAboveMax", { field: fieldLabel, max });
  }
  return "";
}

export function validateProjectTemplateForm(form, existingTemplates = []) {
  const errors = { fields: {}, sections: {} };
  const name = form.name.trim().toLowerCase();

  if (!name) {
    errors.fields.name = i18n.t(
      "projectTemplateConfiguration.errors.nameRequired",
      "Name is required."
    );
  } else if (
    existingTemplates.some(
      (template) =>
        template.id !== form.id &&
        String(template.name || "").trim().toLowerCase() === name
    )
  ) {
    errors.fields.name = i18n.t(
      "projectTemplateConfiguration.errors.nameNotUnique",
      "A Project Template with this name already exists."
    );
  }

  if (form.defaultTemplate && !form.active) {
    errors.fields.defaultTemplate = i18n.t(
      "projectTemplateConfiguration.errors.defaultNotActive",
      "The default Project Template must be active."
    );
  }

  if (form.sections.length === 0) {
    errors.fields.sections = i18n.t(
      "projectTemplateConfiguration.errors.sectionRequired",
      "At least one section is required."
    );
  }

  const sectionTitles = new Set(
    form.sections
      .map((section) => section.title.trim().toLowerCase())
      .filter(Boolean)
  );
  const missingCoreSections = CORE_SECTION_TITLES.filter(
    (title) => !sectionTitles.has(title.toLowerCase())
  );
  if (missingCoreSections.length > 0) {
    errors.fields.coreStructure = i18n.t(
      "projectTemplateConfiguration.errors.coreSectionsRequired",
      {
        sections: missingCoreSections.join(", "),
        defaultValue: "Missing required Project Template sections: {{sections}}.",
      }
    );
  }

  const requirementKeys = new Set(
    form.sections
      .flatMap((section) => section.requirements || [])
      .map((requirement) => String(requirement.stableKey || "").trim())
      .filter(Boolean)
  );
  const missingCoreRequirements = CORE_REQUIREMENT_KEYS.filter(
    (stableKey) => !requirementKeys.has(stableKey)
  );
  if (missingCoreRequirements.length > 0) {
    errors.fields.coreRequirements = i18n.t(
      "projectTemplateConfiguration.errors.coreRequirementsRequired",
      {
        requirements: missingCoreRequirements.join(", "),
        defaultValue: "Missing required Project Template requirements: {{requirements}}.",
      }
    );
  }

  const seenKeys = new Set();
  const seenGeneratedLabelKeys = new Set();

  form.sections.forEach((section, sectionIndex) => {
    const sectionErrors = { title: "", condition: "", requirementsEmpty: "", requirements: {} };

    if (!section.title.trim()) {
      sectionErrors.title = i18n.t(
        "projectTemplateConfiguration.errors.sectionTitleRequired",
        "Section title is required."
      );
    }

    if (section.dependsOnRequirementKey) {
      const eligible = getEligibleDependencyRequirements(form.sections, sectionIndex);
      const dependency = eligible.find(
        (requirement) => getRequirementReferenceKey(requirement) === section.dependsOnRequirementKey
      );
      if (!dependency) {
        sectionErrors.condition = i18n.t(
          "projectTemplateConfiguration.errors.conditionRequirementInvalid",
          "Select a requirement from an earlier section."
        );
      } else if (!section.visibleWhenValues || section.visibleWhenValues.length === 0) {
        sectionErrors.condition = i18n.t(
          "projectTemplateConfiguration.errors.conditionValuesRequired",
          "Select at least one value for the display condition."
        );
      } else {
        const conditionOptions = new Set(getConditionValueOptions(dependency));
        const invalidConditionValue = section.visibleWhenValues.find(
          (value) => !conditionOptions.has(value)
        );
        if (invalidConditionValue) {
          sectionErrors.condition = i18n.t(
            "projectTemplateConfiguration.errors.conditionValueInvalid",
            "The display condition contains a value that is not allowed by the selected requirement."
          );
        }
      }
    }

    if (section.requirements.length === 0) {
      sectionErrors.requirementsEmpty = i18n.t(
        "projectTemplateConfiguration.errors.requirementRequired",
        "Each section needs at least one requirement."
      );
    }

    section.requirements.forEach((requirement) => {
      const requirementErrors = {};
      const stableKey = String(requirement.stableKey || "").trim();
      const label = requirement.label.trim();
      const generatedLabelKey = generateStableKeyFromLabel(label);

      if (!label) {
        requirementErrors.label = i18n.t(
          "projectTemplateConfiguration.errors.labelRequired",
          "Label is required."
        );
      } else if (!generatedLabelKey) {
        requirementErrors.label = i18n.t(
          "projectTemplateConfiguration.errors.labelMeaningful",
          "Label must contain at least one letter or number."
        );
      } else if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(generatedLabelKey)) {
        requirementErrors.label = i18n.t(
          "projectTemplateConfiguration.errors.labelGeneratedKeyInvalid",
          "Label must generate a key that starts with a letter."
        );
      } else if (seenGeneratedLabelKeys.has(generatedLabelKey.toLowerCase())) {
        requirementErrors.label = i18n.t(
          "projectTemplateConfiguration.errors.generatedKeyNotUnique",
          {
            key: generatedLabelKey,
            defaultValue: "Another requirement generates the same key '{{key}}'.",
          }
        );
      } else {
        seenGeneratedLabelKeys.add(generatedLabelKey.toLowerCase());
      }

      if (stableKey) {
        if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(stableKey)) {
          requirementErrors.label = i18n.t(
            "projectTemplateConfiguration.errors.savedKeyInvalid",
            "This requirement has an invalid saved key."
          );
        } else if (seenKeys.has(stableKey.toLowerCase())) {
          requirementErrors.label = i18n.t(
            "projectTemplateConfiguration.errors.generatedKeyNotUnique",
            {
              key: stableKey,
              defaultValue: "Another requirement generates the same key '{{key}}'.",
            }
          );
        } else {
          seenKeys.add(stableKey.toLowerCase());
        }
      }

      if (
        isSelectableValueType(requirement.valueType) &&
        parseAllowedValues(requirement.allowedValuesText).length === 0
      ) {
        requirementErrors.allowedValuesText = i18n.t(
          "projectTemplateConfiguration.errors.allowedValuesRequired",
          "At least one allowed value is required."
        );
      }

      const allowedValues = parseAllowedValues(requirement.allowedValuesText);

      const min = requirement.minValue === "" ? null : Number(requirement.minValue);
      const max = requirement.maxValue === "" ? null : Number(requirement.maxValue);
      if (min !== null && max !== null && min > max) {
        requirementErrors.maxValue = i18n.t(
          "projectTemplateConfiguration.errors.minGreaterThanMax",
          "Minimum value cannot be greater than maximum value."
        );
      }

      const defaultValueError = validateConfiguredValue(requirement, "defaultValue", allowedValues);
      if (defaultValueError) {
        requirementErrors.defaultValue = defaultValueError;
      }

      if (Object.keys(requirementErrors).length > 0) {
        sectionErrors.requirements[requirement.clientId] = requirementErrors;
      }
    });

    if (
      sectionErrors.title ||
      sectionErrors.condition ||
      sectionErrors.requirementsEmpty ||
      Object.keys(sectionErrors.requirements).length > 0
    ) {
      errors.sections[section.clientId] = sectionErrors;
    }
  });

  return errors;
}

export function hasProjectTemplateFormErrors(errors) {
  if (Object.keys(errors.fields).length > 0) return true;
  return Object.keys(errors.sections).length > 0;
}

export function buildProjectTemplatePayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    active: Boolean(form.active),
    defaultTemplate: Boolean(form.defaultTemplate),
    sections: form.sections.map((section, sectionIndex) => ({
      id: section.id || null,
      title: section.title.trim(),
      helpText: section.helpText.trim() || null,
      displayOrder: sectionIndex + 1,
      dependsOnRequirementKey: section.dependsOnRequirementKey || null,
      visibleWhenValues: section.dependsOnRequirementKey ? section.visibleWhenValues : [],
      requirements: section.requirements.map((requirement, requirementIndex) => ({
        id: requirement.id || null,
        stableKey: String(requirement.stableKey || "").trim() || null,
        label: requirement.label.trim(),
        helpText: requirement.helpText.trim() || null,
        displayOrder: requirementIndex + 1,
        valueType: requirement.valueType,
        required: Boolean(requirement.required),
        constraintType: requirement.constraintType,
        defaultValue: requirement.defaultValue.trim() || null,
        fixedValue: requirement.fixedValue.trim() || null,
        unit: requirement.unit.trim() || null,
        minValue: requirement.minValue === "" ? null : Number(requirement.minValue),
        maxValue: requirement.maxValue === "" ? null : Number(requirement.maxValue),
        allowedValues: isSelectableValueType(requirement.valueType)
          ? parseAllowedValues(requirement.allowedValuesText)
          : [],
        evaluatorKey: null,
        source: requirement.source.trim() || null,
        rationale: requirement.rationale.trim() || null,
      })),
    })),
  };
}
