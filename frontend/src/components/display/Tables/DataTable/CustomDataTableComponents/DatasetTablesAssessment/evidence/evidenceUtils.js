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

  const individualFields = [
    "distinction",
    "separation",
    "singletonFraction",
  ];
  const overall = quantitative.subsetContext?.overall;

  return (
    individualFields.some((field) =>
      hasEvidenceValue(quantitative.individual?.[field])
    ) ||
    hasEvidenceValue(overall?.meanDistinction) ||
    hasEvidenceValue(overall?.meanSeparation)
  );
}

function hasEvidenceDetails(evidence) {
  if (!evidence) return false;

  return Boolean(
    hasQuantitativeEvidenceDetails(evidence.quantitative) ||
      evidence.historical?.observations?.length
  );
}

export function shouldShowEvidenceIcon(evidence) {
  return hasEvidenceDetails(evidence);
}
