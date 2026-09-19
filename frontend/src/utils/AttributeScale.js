import defaultLowIcon from "../assets/images/icons/measurements/default/low.png";
import defaultModerateIcon from "../assets/images/icons/measurements/default/moderate.png";
import defaultHighIcon from "../assets/images/icons/measurements/default/high.png";
import extendedLowIcon from "../assets/images/icons/measurements/extended/low.png";
import extendedModerateIcon from "../assets/images/icons/measurements/extended/moderate.png";
import extendedHighIcon from "../assets/images/icons/measurements/extended/high.png";
import extendedVeryHighIcon from "../assets/images/icons/measurements/extended/veryHigh.png";
import extendedCriticalIcon from "../assets/images/icons/measurements/extended/critical.png";

export const ATTRIBUTE_SCALE_FIELDS = Object.freeze([
  "sensitivity",
  "replicability",
  "availability",
  "distinguishability",
]);

const DEFAULT_MEASUREMENT_ICONS_BY_LABEL = Object.freeze({
  low: defaultLowIcon,
  moderate: defaultModerateIcon,
  high: defaultHighIcon,
});

const EXTENDED_MEASUREMENT_ICONS_BY_LABEL = Object.freeze({
  low: extendedLowIcon,
  moderate: extendedModerateIcon,
  high: extendedHighIcon,
  "very high": extendedVeryHighIcon,
  veryhigh: extendedVeryHighIcon,
  critical: extendedCriticalIcon,
});

const normalizeMeasurementLabel = (label) =>
  String(label || "").trim().toLowerCase();

const compactMeasurementLabel = (label) =>
  normalizeMeasurementLabel(label).replace(/[\s_-]/g, "");

export function getMeasurementIconVariant(options = []) {
  return Array.isArray(options) && options.length > 3
    ? "extended"
    : "default";
}

export function getMeasurementIcon({ dimensionOptions = [], label }) {
  const normalizedLabel = normalizeMeasurementLabel(label);
  const compactLabel = compactMeasurementLabel(label);
  const icons =
    getMeasurementIconVariant(dimensionOptions) === "extended"
      ? EXTENDED_MEASUREMENT_ICONS_BY_LABEL
      : DEFAULT_MEASUREMENT_ICONS_BY_LABEL;

  return icons[normalizedLabel] || icons[compactLabel] || null;
}

export const ATTRIBUTE_SCALE_OPTIONS = Object.freeze([
  { value: 1, label: "Low", icon: defaultLowIcon },
  { value: 2, label: "Moderate", icon: defaultModerateIcon },
  { value: 3, label: "High", icon: defaultHighIcon },
]);

export const ATTRIBUTE_SCALE_DEFAULTS = Object.freeze({
  sensitivity: 2,
  replicability: 2,
  availability: 2,
  distinguishability: 2,
});

export const ATTRIBUTE_SCALE_VALUES = Object.freeze(
  ATTRIBUTE_SCALE_OPTIONS.map((option) => option.value)
);

const SORTED_ATTRIBUTE_SCALE_VALUES = [...ATTRIBUTE_SCALE_VALUES].sort(
  (a, b) => a - b
);

export const ATTRIBUTE_SCALE_DEFAULT_VALUE =
  ATTRIBUTE_SCALE_DEFAULTS.sensitivity ?? ATTRIBUTE_SCALE_VALUES[0] ?? null;

export const ATTRIBUTE_SCALE_MIN = SORTED_ATTRIBUTE_SCALE_VALUES[0];
export const ATTRIBUTE_SCALE_MAX =
  SORTED_ATTRIBUTE_SCALE_VALUES[SORTED_ATTRIBUTE_SCALE_VALUES.length - 1];

const ATTRIBUTE_SCALE_VALUES_ARE_CONSECUTIVE = SORTED_ATTRIBUTE_SCALE_VALUES.every(
  (value, index, values) => index === 0 || value === values[index - 1] + 1
);

export const ATTRIBUTE_SCALE_RANGE_LABEL =
  SORTED_ATTRIBUTE_SCALE_VALUES.length > 1 &&
  ATTRIBUTE_SCALE_VALUES_ARE_CONSECUTIVE
    ? `${ATTRIBUTE_SCALE_MIN}-${
        SORTED_ATTRIBUTE_SCALE_VALUES[SORTED_ATTRIBUTE_SCALE_VALUES.length - 1]
      }`
    : SORTED_ATTRIBUTE_SCALE_VALUES.join(", ");

export const LEGACY_ATTRIBUTE_SCORING_SYSTEM = Object.freeze({
  id: null,
  name: "REA Default Scoring System",
  versionNumber: 1,
  defaultIdentifiabilityThreshold: 5,
  defaultSensitivityThreshold: 2,
  scoreOptions: Object.freeze({
    sensitivity: ATTRIBUTE_SCALE_OPTIONS,
    replicability: ATTRIBUTE_SCALE_OPTIONS,
    availability: ATTRIBUTE_SCALE_OPTIONS,
    distinguishability: ATTRIBUTE_SCALE_OPTIONS,
  }),
  attainableScoreRanges: Object.freeze({
    identifiability: { min: 3, max: 9 },
    sensitivity: { min: 1, max: 3 },
  }),
});

function normalizeOption(option, index, dimensionOptions) {
  const label = option?.label || "";
  return {
    ...option,
    value: Number(option?.value),
    label,
    displayOrder: option?.displayOrder ?? index + 1,
    icon: getMeasurementIcon({ dimensionOptions, label }),
  };
}

export function getOptionsForAttributeField(field, scoringSystem) {
  const options = scoringSystem?.scoreOptions?.[field];
  const selectedOptions = Array.isArray(options) && options.length > 0
    ? options
    : ATTRIBUTE_SCALE_OPTIONS;

  return selectedOptions
    .map((option, index) =>
      normalizeOption(option, index, selectedOptions)
    )
    .filter((option) => Number.isFinite(option.value))
    .sort((a, b) => {
      const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      return orderDiff !== 0 ? orderDiff : a.value - b.value;
    });
}

export function getAttributeScaleOption(value, field, scoringSystem) {
  const numericValue = Number(value);
  return getOptionsForAttributeField(field, scoringSystem).find(
    (option) => option.value === numericValue
  );
}

export function isAttributeScaleValue(value, field, scoringSystem) {
  return Boolean(getAttributeScaleOption(value, field, scoringSystem));
}

export function getAttributeScaleDefault(field, scoringSystem) {
  const options = getOptionsForAttributeField(field, scoringSystem);
  if (options.length === 0) {
    return ATTRIBUTE_SCALE_DEFAULTS[field] ?? ATTRIBUTE_SCALE_DEFAULT_VALUE;
  }

  const middleIndex = Math.floor((options.length - 1) / 2);
  return options[middleIndex]?.value ?? ATTRIBUTE_SCALE_DEFAULTS[field] ?? ATTRIBUTE_SCALE_DEFAULT_VALUE;
}

export function normalizeAttributeScaleValue(
  value,
  field,
  { allowNull = true, scoringSystem } = {}
) {
  if (value === null) {
    return allowNull ? null : getAttributeScaleDefault(field, scoringSystem);
  }

  if (value === undefined || value === "") {
    return getAttributeScaleDefault(field, scoringSystem);
  }

  const option = getAttributeScaleOption(value, field, scoringSystem);
  return option ? option.value : getAttributeScaleDefault(field, scoringSystem);
}

export function getDefaultAttributeScaleMetrics(scoringSystem) {
  return ATTRIBUTE_SCALE_FIELDS.reduce((metrics, field) => {
    metrics[field] = getAttributeScaleDefault(field, scoringSystem);
    return metrics;
  }, {});
}

function getRangeValues(scoringSystem, rangeKey, fallbackMin, fallbackMax) {
  const range = scoringSystem?.attainableScoreRanges?.[rangeKey];
  return {
    min: Number.isFinite(Number(range?.min)) ? Number(range.min) : fallbackMin,
    max: Number.isFinite(Number(range?.max)) ? Number(range.max) : fallbackMax,
  };
}

export function getIdentifiabilityScoreRange(scoringSystem) {
  return getRangeValues(scoringSystem, "identifiability", 3, 9);
}

export function getSensitivityScoreRange(scoringSystem) {
  return getRangeValues(
    scoringSystem,
    "sensitivity",
    ATTRIBUTE_SCALE_MIN,
    ATTRIBUTE_SCALE_MAX
  );
}

export function formatScoreValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
}

export function formatScoreRange(range) {
  return `${formatScoreValue(range.min)}-${formatScoreValue(range.max)}`;
}
