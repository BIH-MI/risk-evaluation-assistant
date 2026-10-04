import {
  buildDistinguishabilityQuantitativeEvidence,
} from "./metricEvidence";
import {
  ATTRIBUTE_EVIDENCE_DIMENSIONS,
  buildHistoricalEvidenceForAttribute,
} from "./previousAssessmentEvidence";

function buildDimensionEvidence({
  dimension,
  attribute,
  historicalEvidence,
}) {
  const baseEvidence = {
    historical: historicalEvidence,
  };

  if (dimension === "distinguishability") {
    return {
      quantitative: buildDistinguishabilityQuantitativeEvidence(attribute),
      ...baseEvidence,
    };
  }

  return baseEvidence;
}

export function buildAttributeEvidence({
  dataset,
  previousAssessments = [],
  selectedPreviousAssessment,
  scoringSystem,
}) {
  const evidenceByAttributeId = {};
  const historicalAssessments = previousAssessments.length
    ? previousAssessments
    : selectedPreviousAssessment
    ? [selectedPreviousAssessment]
    : [];

  (dataset?.tables || []).forEach((table) => {
    (table.attributes || []).forEach((attribute) => {
      if (attribute.excluded || attribute.isExcluded) return;

      const historicalByDimension = buildHistoricalEvidenceForAttribute({
        previousAssessments: historicalAssessments,
        attributeId: attribute.id,
        scoringSystem,
      });

      // Profiling and historical evidence are read-only decision support. The
      // assessment value selected by the user remains authoritative.
      evidenceByAttributeId[attribute.id] =
        ATTRIBUTE_EVIDENCE_DIMENSIONS.reduce((acc, dimension) => {
          acc[dimension] = buildDimensionEvidence({
            dimension,
            attribute,
            historicalEvidence: historicalByDimension[dimension],
          });
          return acc;
        }, {});
    });
  });

  return evidenceByAttributeId;
}
