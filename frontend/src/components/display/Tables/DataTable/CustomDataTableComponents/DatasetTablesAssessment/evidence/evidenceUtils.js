import { getAttributeScaleOption } from "utils/AttributeScale";

export const hasEvidenceValue = (value) =>
  value !== null && value !== undefined;

export const formatMetricNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
};

/**
 * Formats Distinction, Separation and Singleton fraction for display with
 * 4 decimal places (an exact zero is "0.0000"), and more places only when 4
 * would show a nonzero value as zero (or a value below 1 as 1). Display only;
 * the stored values are unchanged.
 */
export const formatDistinguishabilityValue = (value) => {
  if (!hasEvidenceValue(value) || value === "") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;

  let fractionDigits = 4;
  while (fractionDigits < 12) {
    const factor = 10 ** fractionDigits;
    const rounded = Math.round(numeric * factor) / factor;
    const hidesNonzero = rounded === 0 && numeric !== 0;
    const hidesBelowOne = Math.abs(rounded) === 1 && Math.abs(numeric) !== 1;
    if (!hidesNonzero && !hidesBelowOne) break;
    fractionDigits += 1;
  }

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: fractionDigits,
  });
};

export const titleCaseToken = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());

export const formatScaleLabel = (value, field, scoringSystem) => {
  const option = getAttributeScaleOption(value, field, scoringSystem);
  return option?.label || value;
};

export function hasQuantitativeEvidenceDetails(quantitative) {
  if (!quantitative) return false;

  const individualFields = ["distinction", "separation", "singletonFraction"];
  const overall = quantitative.subsetContext?.overall;

  return (
    individualFields.some((field) =>
      hasEvidenceValue(quantitative.individual?.[field])
    ) ||
    hasEvidenceValue(overall?.meanDistinction) ||
    hasEvidenceValue(overall?.meanSeparation) ||
    hasEvidenceValue(overall?.meanSingletonFraction)
  );
}

export function shouldShowEvidenceIcon(evidence) {
  if (!evidence) return false;

  return Boolean(
    hasQuantitativeEvidenceDetails(evidence.quantitative) ||
      evidence.historical?.observations?.length
  );
}
