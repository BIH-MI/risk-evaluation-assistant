import lowIcon from "assets/images/icons/measurements/low.png";
import mediumIcon from "assets/images/icons/measurements/medium.png";
import highIcon from "assets/images/icons/measurements/high.png";

export const ATTRIBUTE_SCALE_FIELDS = Object.freeze([
  "sensitivity",
  "replicability",
  "availability",
  "distinguishability",
]);

export const ATTRIBUTE_SCALE_OPTIONS = Object.freeze([
  { value: 1, label: "Low", icon: lowIcon },
  { value: 2, label: "Medium", icon: mediumIcon },
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

export function getAttributeScaleOption(value) {
  const numericValue = Number(value);
  return ATTRIBUTE_SCALE_OPTIONS.find((option) => option.value === numericValue);
}

export function isAttributeScaleValue(value) {
  return Boolean(getAttributeScaleOption(value));
}

export function getAttributeScaleDefault(field) {
  return ATTRIBUTE_SCALE_DEFAULTS[field] ?? ATTRIBUTE_SCALE_DEFAULT_VALUE;
}

export function normalizeAttributeScaleValue(
  value,
  field,
  { allowNull = true } = {}
) {
  if (value === null) {
    return allowNull ? null : getAttributeScaleDefault(field);
  }

  if (value === undefined || value === "") {
    return getAttributeScaleDefault(field);
  }

  const option = getAttributeScaleOption(value);
  return option ? option.value : getAttributeScaleDefault(field);
}

export function getDefaultAttributeScaleMetrics() {
  return ATTRIBUTE_SCALE_FIELDS.reduce((metrics, field) => {
    metrics[field] = getAttributeScaleDefault(field);
    return metrics;
  }, {});
}
