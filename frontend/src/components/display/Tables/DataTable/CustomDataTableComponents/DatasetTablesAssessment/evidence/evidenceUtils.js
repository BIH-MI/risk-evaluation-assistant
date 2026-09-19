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

export const formatMethod = (value) => {
  if (value === "within_subject_exact_agreement") {
    return "Within-subject exact agreement";
  }

  return titleCaseToken(value);
};

export const formatUnavailableReason = (value) => {
  if (value === "insufficient_valid_comparisons") {
    return "Insufficient valid comparisons";
  }
  if (value === "unsupported_data_type") {
    return "Unsupported data type";
  }
  if (value === "unavailable") {
    return "No repeated-measure evidence";
  }

  return titleCaseToken(value);
};

export const formatScaleLabel = (value, field, scoringSystem) => {
  const option = getAttributeScaleOption(value, field, scoringSystem);
  return option?.label || value;
};

export function buildEquivalenceClassSizeEvidenceRows(quantitative, t) {
  return [
    {
      label: t("datasetAssessments.evidence.minimumShort", "min"),
      value: quantitative.minimumEquivalenceClassSize,
    },
    {
      label: t("datasetAssessments.evidence.medianShort", "Median"),
      value: quantitative.medianEquivalenceClassSize,
    },
    {
      label: t("datasetAssessments.evidence.maximumShort", "max"),
      value: quantitative.maximumEquivalenceClassSize,
    },
  ]
    .filter(({ value }) => hasEvidenceValue(value))
    .map(({ label, value }) => ({ label, value: formatMetricNumber(value) }));
}

export function hasEmpiricalEvidenceDetails(empirical) {
  if (!empirical) return false;

  if (empirical.available === false) {
    return hasEvidenceValue(empirical.reason);
  }

  return (
    hasEvidenceValue(empirical.score) ||
    hasEvidenceValue(empirical.method) ||
    hasEvidenceValue(empirical.comparisonCount) ||
    hasEvidenceValue(empirical.repeatedSubjectCount) ||
    hasEvidenceValue(empirical.repeatedSubjectFraction) ||
    hasEvidenceValue(empirical.analysisUnit)
  );
}

export function hasQuantitativeEvidenceDetails(quantitative) {
  if (!quantitative) return false;

  return [
    "distinction",
    "separation",
    "singletonFraction",
    "minimumEquivalenceClassSize",
    "maximumEquivalenceClassSize",
  ].some((field) => hasEvidenceValue(quantitative[field]));
}

export function hasSemanticEvidenceDetails(semantic) {
  if (!semantic) return false;

  return Boolean(semantic.summary || semantic.concept);
}

function hasEvidenceDetails(evidence) {
  if (!evidence) return false;

  return Boolean(
    hasEmpiricalEvidenceDetails(evidence.empirical) ||
      hasQuantitativeEvidenceDetails(evidence.quantitative) ||
      hasSemanticEvidenceDetails(evidence.semantic) ||
      evidence.historical?.observations?.length
  );
}

export function shouldShowEvidenceIcon(evidence) {
  return hasEvidenceDetails(evidence);
}
