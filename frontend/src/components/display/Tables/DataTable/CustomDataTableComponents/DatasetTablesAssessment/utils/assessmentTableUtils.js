import { hasEvidenceValue } from "../evidence/evidenceUtils";

const EVIDENCE_FIELDS = new Set([
  "replicability",
  "availability",
  "distinguishability",
  "sensitivity",
]);

const nullAssessmentMetrics = {
  sensitivity: null,
  replicability: null,
  availability: null,
  distinguishability: null,
};

export const getTableIdsKey = (tables) =>
  (Array.isArray(tables) ? tables : [])
    .map((tbl) => String(tbl.tableId))
    .join("|");

export const isDirectIdentifierAttribute = (attribute) =>
  Boolean(attribute?.isDirectIdentifier || attribute?.isExcluded);

export const normalizeAssessmentAttributeState = (attribute) =>
  attribute.isExcluded
    ? {
        ...attribute,
        ...nullAssessmentMetrics,
        isDirectIdentifier: true,
      }
    : attribute;

export function getAttributeFieldEvidence(
  attribute,
  field,
  attributeEvidenceById
) {
  if (!EVIDENCE_FIELDS.has(field)) return null;

  const datasetAttributeEvidence =
    attribute.datasetAttributeId !== null &&
    attribute.datasetAttributeId !== undefined
      ? attributeEvidenceById?.[attribute.datasetAttributeId]?.[field]
      : null;

  return (
    datasetAttributeEvidence ||
    attributeEvidenceById?.[attribute.attributeId]?.[field] ||
    null
  );
}

export function getOriginalAssessmentValue(
  attribute,
  field,
  originalAssessmentValuesByAttributeId
) {
  const datasetAttributeValues =
    attribute.datasetAttributeId !== null &&
    attribute.datasetAttributeId !== undefined
      ? originalAssessmentValuesByAttributeId?.[attribute.datasetAttributeId]
      : null;
  const attributeValues =
    originalAssessmentValuesByAttributeId?.[attribute.attributeId];

  return (datasetAttributeValues || attributeValues)?.[field];
}

export function scaleValuesAreEqual(left, right) {
  if (!hasEvidenceValue(left) || !hasEvidenceValue(right)) {
    return left === right;
  }

  const numericLeft = Number(left);
  const numericRight = Number(right);
  if (Number.isFinite(numericLeft) && Number.isFinite(numericRight)) {
    return numericLeft === numericRight;
  }

  return String(left) === String(right);
}
