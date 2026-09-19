import {
  getDefaultAttributeScaleMetrics,
  normalizeAttributeScaleValue,
} from "utils/AttributeScale";
import { buildDatasetAttributeDisplayEvidence } from "screens/datasetAssessments/evidence/datasetAttributeDisplayEvidence";

const isExcludedAttribute = (attribute) =>
  Boolean(attribute?.excluded ?? attribute?.isExcluded);

const getDirectIdentifierValue = (attribute) =>
  Boolean(attribute?.isDirectIdentifier ?? attribute?.directIdentifier);

const normalizeSavedValue = (value, field, scoringSystem) =>
  normalizeAttributeScaleValue(value, field, {
    allowNull: false,
    scoringSystem,
  });

/**
 * Excluded dataset attributes represent Direct Identifiers at assessment time.
 * They remain visible for transparency but do not receive R/A/D/S scores.
 */
function buildCreateAttributeRow(
  attribute,
  scoringSystem,
  displayEvidence
) {
  const excluded = isExcludedAttribute(attribute);

  return {
    id: null,
    name: attribute.name,
    dataType: attribute.dataType,
    attributeId: attribute.id,
    ...(excluded
      ? {
          sensitivity: null,
          replicability: null,
          availability: null,
          distinguishability: null,
        }
      : getDefaultAttributeScaleMetrics(scoringSystem)),
    isDirectIdentifier: excluded ? true : false,
    isExcluded: excluded,
    ...displayEvidence,
  };
}

function buildEditAttributeRow(
  attribute,
  savedAttribute,
  scoringSystem,
  displayEvidence
) {
  const excluded = isExcludedAttribute(attribute);

  return {
    id: savedAttribute?.id ?? null,
    name: attribute.name,
    dataType: attribute.dataType,
    attributeId: attribute.id,
    sensitivity: excluded
      ? null
      : normalizeSavedValue(
          savedAttribute?.sensitivity,
          "sensitivity",
          scoringSystem
        ),
    replicability: excluded
      ? null
      : normalizeSavedValue(
          savedAttribute?.replicability,
          "replicability",
          scoringSystem
        ),
    availability: excluded
      ? null
      : normalizeSavedValue(
          savedAttribute?.availability,
          "availability",
          scoringSystem
        ),
    distinguishability: excluded
      ? null
      : normalizeSavedValue(
          savedAttribute?.distinguishability,
          "distinguishability",
          scoringSystem
        ),
    isDirectIdentifier: excluded
      ? true
      : getDirectIdentifierValue(savedAttribute),
    isExcluded: excluded,
    ...displayEvidence,
  };
}

export function groupAssessmentAttributes(attributes = []) {
  const directIdentifiers = [];
  const candidateQids = [];
  const remaining = [];

  attributes.forEach((attribute, originalIndex) => {
    const row = {
      ...attribute,
      _originalOrder: originalIndex,
    };

    if (row.isExcluded || row.isDirectIdentifier) {
      directIdentifiers.push(row);
      return;
    }

    if (
      Array.isArray(row.candidateQidCombinations) &&
      row.candidateQidCombinations.length > 0
    ) {
      candidateQids.push(row);
      return;
    }

    remaining.push(row);
  });

  return [
    ...directIdentifiers,
    ...candidateQids,
    ...remaining,
  ].map(({ _originalOrder, ...attribute }) => attribute);
}

export function buildAssessmentTables({
  dataset,
  assessment,
  isEditMode,
  scoringSystem,
}) {
  if (!dataset) return [];

  const savedTablesById = new Map(
    (assessment?.tableAssessments || []).map((tableAssessment) => [
      String(tableAssessment.tableId),
      tableAssessment,
    ])
  );

  return (dataset.tables || []).map((table) => {
    const savedTable = isEditMode
      ? savedTablesById.get(String(table.id))
      : null;
    const savedAttributesById = new Map(
      (savedTable?.attributes || []).map((attribute) => [
        String(attribute.attributeId),
        attribute,
      ])
    );
    const displayEvidenceByAttributeId =
      buildDatasetAttributeDisplayEvidence(table);
    const assessmentAttributes = (table.attributes || []).map((attribute) =>
      isEditMode
        ? buildEditAttributeRow(
            attribute,
            savedAttributesById.get(String(attribute.id)),
            scoringSystem,
            displayEvidenceByAttributeId.get(String(attribute.id)) || {}
          )
        : buildCreateAttributeRow(
            attribute,
            scoringSystem,
            displayEvidenceByAttributeId.get(String(attribute.id)) || {}
          )
    );

    return {
      id: savedTable?.id ?? null,
      tableId: table.id,
      tableName: table.name,
      attributes: groupAssessmentAttributes(assessmentAttributes),
    };
  });
}
