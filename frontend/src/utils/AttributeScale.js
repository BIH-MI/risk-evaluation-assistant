import lowIcon from "assets/images/icons/measurements/low.png";
import moderateIcon from "assets/images/icons/measurements/moderate.png";
import highIcon from "assets/images/icons/measurements/high.png";
import veryHighIcon from "assets/images/icons/measurements/veryHigh.png";
import criticalIcon from "assets/images/icons/measurements/critical.png";

export const ATTRIBUTE_SCALE_FIELDS = Object.freeze([
  "sensitivity",
  "replicability",
  "availability",
  "distinguishability",
]);

export const ATTRIBUTE_SCALE_OPTIONS = Object.freeze([
  { value: 1, label: "Low", icon: lowIcon },
  { value: 2, label: "Moderate", icon: moderateIcon },
  { value: 3, label: "High", icon: highIcon },
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

const OPTION_ICON_BY_LABEL = {
  low: lowIcon,
  moderate: moderateIcon,
  high: highIcon,
  "very high": veryHighIcon,
  veryhigh: veryHighIcon,
  critical: criticalIcon,
};

function normalizeOption(option, index) {
  const label = option?.label || "";
  const normalizedLabel = label.toLowerCase().trim();
  return {
    ...option,
    value: Number(option?.value),
    label,
    displayOrder: option?.displayOrder ?? index + 1,
    icon:
      option?.icon ||
      OPTION_ICON_BY_LABEL[normalizedLabel] ||
      OPTION_ICON_BY_LABEL[normalizedLabel.replace(/[\s_-]/g, "")] ||
      null,
  };
}

export function getOptionsForAttributeField(field, scoringSystem) {
  const options = scoringSystem?.scoreOptions?.[field];
  const selectedOptions = Array.isArray(options) && options.length > 0
    ? options
    : ATTRIBUTE_SCALE_OPTIONS;

  return selectedOptions
    .map(normalizeOption)
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
