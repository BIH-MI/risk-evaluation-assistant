import {
  getAttributeScaleOption,
  normalizeAttributeScaleValue,
} from "utils/AttributeScale";

export const ATTRIBUTE_EVIDENCE_DIMENSIONS = [
  "replicability",
  "availability",
  "distinguishability",
  "sensitivity",
];

const sameId = (left, right) =>
  left !== null &&
  left !== undefined &&
  right !== null &&
  right !== undefined &&
  String(left) === String(right);

const hasScoringIdentity = (assessment) =>
  assessment?.attributeScoringSystemVersionId ||
  assessment?.attributeScoringSystemId ||
  assessment?.attributeScoringSystem?.versionId ||
  assessment?.attributeScoringSystem?.id;

const getAssessmentScoringVersionId = (assessment) =>
  assessment?.attributeScoringSystemVersionId ||
  assessment?.attributeScoringSystem?.versionId ||
  null;

const getAssessmentScoringSystemId = (assessment) =>
  assessment?.attributeScoringSystemId ||
  assessment?.attributeScoringSystem?.id ||
  null;

export function getAssessmentScoringSystemLabel(assessment) {
  const name =
    assessment?.attributeScoringSystemName ||
    assessment?.attributeScoringSystem?.name ||
    "Legacy scoring system";
  const version =
    assessment?.attributeScoringSystemVersion ||
    assessment?.attributeScoringSystem?.versionNumber ||
    assessment?.attributeScoringSystem?.currentVersion;

  return version ? `${name} v${version}` : name;
}

export function getAssessmentConfigurationLabel(assessment) {
  const name =
    assessment?.configurationName ||
    assessment?.configuration?.name ||
    "Unknown configuration";
  const version =
    assessment?.configurationVersion ||
    assessment?.configuration?.versionNumber ||
    assessment?.configuration?.currentVersion;

  return version ? `${name} v${version}` : name;
}

export function getPreviousAssessmentOptionLabel(assessment) {
  if (!assessment) return "";
  return `${
    assessment.name || "Previous assessment"
  } - ${getAssessmentScoringSystemLabel(assessment)}`;
}

export function isAssessmentScoringSystemCompatible(assessment, scoringSystem) {
  const candidateVersionId = getAssessmentScoringVersionId(assessment);
  const selectedVersionId = scoringSystem?.versionId || null;
  const candidateSystemId = getAssessmentScoringSystemId(assessment);
  const selectedSystemId = scoringSystem?.id || null;

  if (candidateVersionId && selectedVersionId) {
    return sameId(candidateVersionId, selectedVersionId);
  }

  if (candidateSystemId || selectedSystemId) {
    return sameId(candidateSystemId, selectedSystemId);
  }

  return !hasScoringIdentity(assessment) && !selectedSystemId;
}

export function findPreviousAssessmentsForDataset({
  assessments,
  selectedDatasetId,
  assessmentId,
}) {
  if (!selectedDatasetId) return [];

  // Historical assessments are retrieved by dataset, not configuration, because
  // they are used as evidence about the same dataset attributes.
  return (assessments || []).filter(
    (assessment) =>
      String(assessment.datasetId) === String(selectedDatasetId) &&
      String(assessment.id) !== String(assessmentId)
  );
}

function findAssessmentAttribute(assessment, attributeId) {
  for (const tableAssessment of assessment?.tableAssessments || []) {
    const matchedAttribute = (tableAssessment.attributes || []).find(
      (attribute) => String(attribute.attributeId) === String(attributeId)
    );

    if (matchedAttribute) return matchedAttribute;
  }

  return null;
}

function getValueLabel(value, dimension, scoringSystem) {
  if (!scoringSystem) {
    return value === null || value === undefined ? "-" : value;
  }
  const option = getAttributeScaleOption(value, dimension, scoringSystem);
  return option?.label || (value === null || value === undefined ? "-" : value);
}

function buildObservation(assessment, attributeId, dimension, scoringSystem) {
  const attribute = findAssessmentAttribute(assessment, attributeId);
  const value = attribute?.[dimension];

  if (value === null || value === undefined) return null;

  const compatible = isAssessmentScoringSystemCompatible(
    assessment,
    scoringSystem
  );
  const sourceScoringSystem = compatible
    ? scoringSystem
    : assessment.attributeScoringSystem;

  return {
    assessmentId: assessment.id,
    assessmentName: assessment.name,
    configurationId: assessment.configurationId ?? null,
    configurationName: assessment.configurationName ?? null,
    configurationVersionId: assessment.configurationVersionId ?? null,
    configurationVersion: assessment.configurationVersion ?? null,
    configurationLabel: getAssessmentConfigurationLabel(assessment),
    scoringSystemId: getAssessmentScoringSystemId(assessment),
    scoringSystemVersionId: getAssessmentScoringVersionId(assessment),
    scoringSystemName:
      assessment.attributeScoringSystemName ||
      assessment.attributeScoringSystem?.name ||
      null,
    scoringSystemVersion:
      assessment.attributeScoringSystemVersion ||
      assessment.attributeScoringSystem?.versionNumber ||
      null,
    scoringSystemLabel: getAssessmentScoringSystemLabel(assessment),
    compatible,
    value,
    valueLabel: getValueLabel(value, dimension, sourceScoringSystem),
  };
}

function summarizeComparableObservations(observations) {
  const comparableObservations = observations.filter(
    (observation) => observation.compatible
  );
  const countByValue = new Map();

  comparableObservations.forEach((observation) => {
    const key = String(observation.value);
    countByValue.set(key, {
      value: observation.value,
      count: (countByValue.get(key)?.count || 0) + 1,
    });
  });

  const rankedValues = Array.from(countByValue.values()).sort(
    (left, right) => right.count - left.count
  );
  const topValue = rankedValues[0] || null;
  const tied =
    topValue &&
    rankedValues.filter((item) => item.count === topValue.count).length > 1;

  return {
    observations,
    count: observations.length,
    comparableCount: comparableObservations.length,
    incompatibleCount: observations.length - comparableObservations.length,
    consensusValue: topValue && !tied ? topValue.value : null,
    consensusCount: topValue && !tied ? topValue.count : 0,
    agreementFraction:
      topValue && !tied && comparableObservations.length > 0
        ? topValue.count / comparableObservations.length
        : null,
  };
}

export function buildHistoricalEvidenceForAttribute({
  previousAssessments,
  attributeId,
  scoringSystem,
}) {
  const historicalByDimension = {};

  ATTRIBUTE_EVIDENCE_DIMENSIONS.forEach((dimension) => {
    const observations = (previousAssessments || [])
      .map((assessment) =>
        buildObservation(assessment, attributeId, dimension, scoringSystem)
      )
      .filter(Boolean);

    historicalByDimension[dimension] =
      observations.length > 0
        ? summarizeComparableObservations(observations)
        : null;
  });

  return historicalByDimension;
}

function buildSourceAttributeMap(sourceAssessment) {
  const attributeMap = new Map();

  (sourceAssessment?.tableAssessments || []).forEach((tableAssessment) => {
    (tableAssessment.attributes || []).forEach((attribute) => {
      if (
        attribute.attributeId !== null &&
        attribute.attributeId !== undefined
      ) {
        attributeMap.set(String(attribute.attributeId), attribute);
      }
    });
  });

  return attributeMap;
}

export function applyPreviousAssessmentValues({
  tables,
  sourceAssessment,
  scoringSystem,
}) {
  if (
    !sourceAssessment ||
    !isAssessmentScoringSystemCompatible(sourceAssessment, scoringSystem)
  ) {
    return tables;
  }

  const sourceAttributesById = buildSourceAttributeMap(sourceAssessment);

  return (tables || []).map((table) => ({
    ...table,
    attributes: (table.attributes || []).map((attribute) => {
      if (attribute.isExcluded) {
        return {
          ...attribute,
          isDirectIdentifier: true,
          sensitivity: null,
          replicability: null,
          availability: null,
          distinguishability: null,
        };
      }

      const sourceAttribute = sourceAttributesById.get(
        String(attribute.attributeId)
      );
      if (!sourceAttribute) return attribute;

      return {
        ...attribute,
        sensitivity: normalizeAttributeScaleValue(
          sourceAttribute.sensitivity,
          "sensitivity",
          { allowNull: false, scoringSystem }
        ),
        replicability: normalizeAttributeScaleValue(
          sourceAttribute.replicability,
          "replicability",
          { allowNull: false, scoringSystem }
        ),
        availability: normalizeAttributeScaleValue(
          sourceAttribute.availability,
          "availability",
          { allowNull: false, scoringSystem }
        ),
        distinguishability: normalizeAttributeScaleValue(
          sourceAttribute.distinguishability,
          "distinguishability",
          { allowNull: false, scoringSystem }
        ),
        isDirectIdentifier: Boolean(
          sourceAttribute.isDirectIdentifier ?? sourceAttribute.directIdentifier
        ),
      };
    }),
  }));
}
