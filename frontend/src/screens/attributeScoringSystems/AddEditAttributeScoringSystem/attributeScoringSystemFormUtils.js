import i18n from "i18n";
import { formatScoreRange } from "utils/AttributeScale";

import {
  ATTRIBUTE_DIMENSIONS,
  MAX_SCORE_OPTIONS_PER_DIMENSION,
  MIN_SCORE_OPTIONS_PER_DIMENSION,
  MIN_SCORE_VALUE,
  SCORE_LABEL_ORDER,
  SCORE_LABEL_RANK,
} from "./attributeScoringSystemConstants";

const DEFAULT_SCORE_OPTIONS = Object.freeze([
  { label: "Low", value: "1" },
  { label: "Moderate", value: "2" },
  { label: "High", value: "3" },
]);

/**
 * Client IDs are used only to keep unsaved score-option rows stable across
 * React renders. They are never serialized to the backend.
 */
export function createScoreOptionClientId() {
  if (
    typeof window !== "undefined" &&
    typeof window.crypto?.randomUUID === "function"
  ) {
    return `scoring-option-${window.crypto.randomUUID()}`;
  }

  return `scoring-option-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createDefaultScoreOptions() {
  return sortScoreOptionsByValue(
    DEFAULT_SCORE_OPTIONS.map((option) => ({
      clientId: createScoreOptionClientId(),
      label: option.label,
      value: option.value,
    }))
  );
}

export function createEmptyScoringSystemForm() {
  return {
    id: null,
    name: "",
    description: "",
    active: true,
    defaultSystem: false,
    defaultIdentifiabilityThreshold: "5",
    defaultSensitivityThreshold: "2",
    scoreOptions: ATTRIBUTE_DIMENSIONS.reduce(
      (optionsByDimension, dimension) => {
        optionsByDimension[dimension.key] = createDefaultScoreOptions();
        return optionsByDimension;
      },
      {}
    ),
  };
}

export function normalizeScoringSystemToForm(system) {
  return {
    id: system.id,
    name: system.name || "",
    description: system.description || "",
    active: Boolean(system.active),
    defaultSystem: Boolean(system.defaultSystem),
    defaultIdentifiabilityThreshold: String(
      system.defaultIdentifiabilityThreshold ?? ""
    ),
    defaultSensitivityThreshold: String(
      system.defaultSensitivityThreshold ?? ""
    ),
    scoreOptions: ATTRIBUTE_DIMENSIONS.reduce(
      (optionsByDimension, dimension) => {
        const options = system.scoreOptions?.[dimension.key] || [];

        optionsByDimension[dimension.key] = sortScoreOptionsByValue(
          options.map((option) => ({
            clientId: createScoreOptionClientId(),
            id: option.id,
            label: option.label || "",
            value: option.value == null ? "" : String(option.value),
          }))
        );

        return optionsByDimension;
      },
      {}
    ),
  };
}

export function normalizeScoreLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function getScoreLabelRank(label) {
  const rank = SCORE_LABEL_RANK[normalizeScoreLabel(label)];
  return Number.isInteger(rank) ? rank : null;
}

function isSupportedScoreLabel(label) {
  return getScoreLabelRank(label) !== null;
}

export function sortScoreOptionsByValue(options = []) {
  return [...(options || [])]
    .map((option, index) => ({ option, index }))
    .sort((a, b) => {
      const valueA = getSortableScoreValue(a.option);
      const valueB = getSortableScoreValue(b.option);

      if (valueA.isFinite && valueB.isFinite && valueA.value !== valueB.value) {
        return valueA.value - valueB.value;
      }

      if (valueA.isFinite !== valueB.isFinite) {
        return valueA.isFinite ? -1 : 1;
      }

      return a.index - b.index;
    })
    .map(({ option }) => option);
}

export function getNextAvailableScoreLabel(options) {
  const usedLabels = new Set(
    (options || [])
      .map((option) => normalizeScoreLabel(option.label))
      .filter(Boolean)
  );

  return (
    SCORE_LABEL_ORDER.find(
      (label) => !usedLabels.has(normalizeScoreLabel(label))
    ) || ""
  );
}

export function normalizeDisplayNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";

  const rounded = Number(numeric.toFixed(6));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function normalizeScoreOptionValue(value) {
  const textValue = String(value ?? "").trim();

  if (textValue === "") {
    return "";
  }

  const numeric = Number(textValue);
  return Number.isFinite(numeric) ? normalizeDisplayNumber(numeric) : textValue;
}

function getNumericScoreValue(option) {
  if (
    option?.value === null ||
    option?.value === undefined ||
    String(option.value).trim() === ""
  ) {
    return null;
  }

  const value = Number(option.value);
  return Number.isFinite(value) ? value : Number.NaN;
}

function getSortableScoreValue(option) {
  const value = getNumericScoreValue(option);

  return {
    isFinite: Number.isFinite(value),
    value,
  };
}

function getValidDimensionScoreOptions(options) {
  const validation = validateDimensionScoreOptions(options);
  return validation.isComplete ? validation.orderedOptions : null;
}

function getValueRange(orderedOptions) {
  const values = orderedOptions.map((option) => Number(option.value));

  if (values.length === 0) {
    return { min: null, max: null, isComplete: false };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    isComplete: true,
  };
}

/**
 * Identifiability is scored as R + A + D, so the attainable range is the sum
 * of the minimum and maximum values configured for those three dimensions.
 */
export function calculateScoringRanges(scoreOptions) {
  const replicabilityRange = calculateDimensionValueRange(
    scoreOptions.replicability
  );
  const availabilityRange = calculateDimensionValueRange(
    scoreOptions.availability
  );
  const distinguishabilityRange = calculateDimensionValueRange(
    scoreOptions.distinguishability
  );
  const sensitivityRange = calculateDimensionValueRange(
    scoreOptions.sensitivity
  );
  const hasIdentifiabilityRange =
    replicabilityRange.isComplete &&
    availabilityRange.isComplete &&
    distinguishabilityRange.isComplete;

  return {
    identifiability: hasIdentifiabilityRange
      ? {
          min:
            replicabilityRange.min +
            availabilityRange.min +
            distinguishabilityRange.min,
          max:
            replicabilityRange.max +
            availabilityRange.max +
            distinguishabilityRange.max,
          isComplete: true,
        }
      : { min: null, max: null, isComplete: false },
    sensitivity: sensitivityRange,
  };
}

export function calculateDimensionValueRange(options) {
  const orderedOptions = getValidDimensionScoreOptions(options);
  return orderedOptions
    ? getValueRange(orderedOptions)
    : { min: null, max: null, isComplete: false };
}

export function validateDimensionScoreOptions(options) {
  const rowErrors = (options || []).map(() => ({}));
  let dimensionError = "";
  const seenLabels = new Set();
  const seenValues = new Set();
  const validEntries = [];

  if ((options || []).length < MIN_SCORE_OPTIONS_PER_DIMENSION) {
    dimensionError = i18n.t(
      "attributeScoringSystems.scoreOptions.errors.minOptionsRequired",
      "At least two score options are required."
    );
  } else if ((options || []).length > MAX_SCORE_OPTIONS_PER_DIMENSION) {
    dimensionError = i18n.t(
      "attributeScoringSystems.scoreOptions.errors.maxOptions",
      {
        defaultValue: `At most ${MAX_SCORE_OPTIONS_PER_DIMENSION} score options are allowed.`,
        max: MAX_SCORE_OPTIONS_PER_DIMENSION,
      }
    );
  }

  (options || []).forEach((option, index) => {
    const label = String(option?.label ?? "").trim();
    const labelKey = normalizeScoreLabel(label);
    const value = getNumericScoreValue(option);
    let hasValidLabel = false;
    let hasValidValue = false;

    if (!label) {
      rowErrors[index].label = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.labelRequired",
        "Label is required."
      );
    } else if (!isSupportedScoreLabel(label)) {
      rowErrors[index].label = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.labelNotPredefined",
        "Select one of the predefined labels."
      );
    } else if (seenLabels.has(labelKey)) {
      rowErrors[index].label = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.labelNotUnique",
        "Label must be unique in this dimension."
      );
    } else {
      seenLabels.add(labelKey);
      hasValidLabel = true;
    }

    if (value === null) {
      rowErrors[index].value = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.valueRequired",
        "Score value is required."
      );
    } else if (Number.isNaN(value)) {
      rowErrors[index].value = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.valueInvalid",
        "Value must be a valid number."
      );
    } else if (value < MIN_SCORE_VALUE) {
      rowErrors[index].value = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.valueNegative",
        "Score value cannot be negative."
      );
    } else if (seenValues.has(String(value))) {
      rowErrors[index].value = i18n.t(
        "attributeScoringSystems.scoreOptions.errors.valueNotUnique",
        "Score value must be unique in this dimension."
      );
    } else {
      seenValues.add(String(value));
      hasValidValue = true;
    }

    if (hasValidLabel && hasValidValue) {
      validEntries.push({
        ...option,
        index,
        label,
        value,
      });
    }
  });

  const orderedOptions = sortScoreOptionsByValue(validEntries);

  const hasRowErrors = rowErrors.some(
    (rowError) => Object.keys(rowError).length > 0
  );

  return {
    rowErrors,
    dimensionError,
    orderedOptions,
    isComplete: !dimensionError && !hasRowErrors,
  };
}

export function validateScoringSystemForm(form, existingSystems = []) {
  const errors = {
    fields: {},
    thresholds: {},
    options: {},
    dimensionErrors: {},
  };
  const name = form.name.trim().toLowerCase();

  if (!name) {
    errors.fields.name = i18n.t(
      "attributeScoringSystems.errors.nameRequired",
      "Name is required."
    );
  } else if (
    existingSystems.some(
      (system) =>
        system.id !== form.id &&
        String(system.name || "")
          .trim()
          .toLowerCase() === name
    )
  ) {
    errors.fields.name = i18n.t(
      "attributeScoringSystems.errors.nameNotUnique",
      "Name must be unique."
    );
  }

  if (form.defaultSystem && !form.active) {
    errors.fields.defaultSystem = i18n.t(
      "attributeScoringSystems.errors.defaultSystemNotActive",
      "The default scoring system must be active."
    );
  }

  ATTRIBUTE_DIMENSIONS.forEach((dimension) => {
    const options = form.scoreOptions[dimension.key] || [];
    const dimensionValidation = validateDimensionScoreOptions(options);
    errors.options[dimension.key] = dimensionValidation.rowErrors;

    if (dimensionValidation.dimensionError) {
      errors.dimensionErrors[dimension.key] =
        dimensionValidation.dimensionError;
    }
  });

  const ranges = calculateScoringRanges(form.scoreOptions);
  const identifiabilityThreshold = Number(form.defaultIdentifiabilityThreshold);
  const sensitivityThreshold = Number(form.defaultSensitivityThreshold);

  /**
   * Identifiability thresholds must remain inside the score range attainable
   * from R + A + D for this scoring system.
   */
  if (!Number.isFinite(identifiabilityThreshold)) {
    errors.thresholds.identifiability = i18n.t(
      "attributeScoringSystems.errors.thresholdInvalid",
      "Threshold must be a valid number."
    );
  } else if (
    ranges.identifiability.isComplete &&
    (identifiabilityThreshold < ranges.identifiability.min ||
      identifiabilityThreshold > ranges.identifiability.max)
  ) {
    errors.thresholds.identifiability = i18n.t(
      "attributeScoringSystems.errors.thresholdOutOfRange",
      {
        defaultValue: `Threshold must be within ${formatScoreRange(
          ranges.identifiability
        )}.`,
        range: formatScoreRange(ranges.identifiability),
      }
    );
  }

  if (!Number.isFinite(sensitivityThreshold)) {
    errors.thresholds.sensitivity = i18n.t(
      "attributeScoringSystems.errors.thresholdInvalid",
      "Threshold must be a valid number."
    );
  } else if (
    ranges.sensitivity.isComplete &&
    (sensitivityThreshold < ranges.sensitivity.min ||
      sensitivityThreshold > ranges.sensitivity.max)
  ) {
    errors.thresholds.sensitivity = i18n.t(
      "attributeScoringSystems.errors.thresholdOutOfRange",
      {
        defaultValue: `Threshold must be within ${formatScoreRange(
          ranges.sensitivity
        )}.`,
        range: formatScoreRange(ranges.sensitivity),
      }
    );
  }

  return errors;
}

export function hasScoringSystemFormErrors(errors) {
  if (Object.keys(errors.fields).length > 0) return true;
  if (Object.keys(errors.thresholds).length > 0) return true;
  if (Object.keys(errors.dimensionErrors).length > 0) return true;

  return Object.values(errors.options).some((rows) =>
    rows.some((row) => Object.keys(row).length > 0)
  );
}

export function buildAttributeScoringSystemPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    active: Boolean(form.active),
    defaultSystem: Boolean(form.defaultSystem),
    defaultIdentifiabilityThreshold: Number(
      form.defaultIdentifiabilityThreshold
    ),
    defaultSensitivityThreshold: Number(form.defaultSensitivityThreshold),
    scoreOptions: ATTRIBUTE_DIMENSIONS.reduce(
      (optionsByDimension, dimension) => {
        const orderedOptions = sortScoreOptionsByValue(
          form.scoreOptions[dimension.key] || []
        );

        /**
         * Score-option order is derived from numeric score value. displayOrder is
         * reconstructed during serialization and is never edited independently.
         */
        optionsByDimension[dimension.key] = orderedOptions.map(
          (option, index) => ({
            id: option.id || null,
            label: option.label.trim(),
            value: Number(option.value),
            description: null,
            displayOrder: index + 1,
          })
        );

        return optionsByDimension;
      },
      {}
    ),
  };
}
