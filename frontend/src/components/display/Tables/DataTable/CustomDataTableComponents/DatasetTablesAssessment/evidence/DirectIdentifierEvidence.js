import React from "react";
import {
  EvidenceLine,
  EvidenceMetricRow,
  EvidenceSection,
} from "./EvidencePrimitives";
import { titleCaseToken } from "./evidenceUtils";

function getDirectIdentifierConceptLabel(concept, t) {
  if (!concept) return "";
  return t(
    `datasets.directIdentifiers.concepts.${concept}`,
    titleCaseToken(concept)
  );
}

function getDirectIdentifierConfidenceLabel(confidence, t) {
  if (confidence === "HIGH") {
    return t("datasetAssessments.evidence.high", "High");
  }
  if (confidence === "LOW") {
    return t("datasetAssessments.evidence.low", "Low");
  }

  return confidence ? titleCaseToken(confidence) : "";
}

function getDirectIdentifierEvidenceSourceLabel(source, t) {
  if (source === "FIELD_NAME") {
    return t("datasetAssessments.evidence.attributeName", "Attribute name");
  }
  if (source === "VALUE_PATTERN") {
    return t("datasetAssessments.evidence.valuePattern", "Value pattern");
  }
  if (source === "FIELD_NAME_AND_VALUE_PATTERN") {
    return t(
      "datasetAssessments.evidence.attributeNameAndValuePattern",
      "Attribute name + value pattern"
    );
  }

  return source ? titleCaseToken(source) : "";
}

function hasAutomaticDirectIdentifierSummary(attribute) {
  return Boolean(
    attribute?.directIdentifierEvidenceSource ||
      attribute?.directIdentifierConcept ||
      attribute?.directIdentifierConfidence
  );
}

/**
 * True when the name tooltip has something to show: a persisted automatic
 * Direct Identifier summary, or an attribute treated as a Direct Identifier or
 * excluded in the assessment.
 */
export function hasDirectIdentifierNameEvidence(attribute) {
  return Boolean(
    hasAutomaticDirectIdentifierSummary(attribute) ||
      attribute?.isDirectIdentifier ||
      attribute?.isExcluded
  );
}

function DirectIdentifierNameEvidence({ attribute, t }) {
  const hasSummary = hasAutomaticDirectIdentifierSummary(attribute);
  const sourceLabel = getDirectIdentifierEvidenceSourceLabel(
    attribute.directIdentifierEvidenceSource,
    t
  );
  const conceptLabel = getDirectIdentifierConceptLabel(
    attribute.directIdentifierConcept,
    t
  );
  const confidenceLabel = getDirectIdentifierConfidenceLabel(
    attribute.directIdentifierConfidence,
    t
  );
  const classificationLabel =
    conceptLabel ||
    (attribute.directIdentifierConfidence === "LOW"
      ? t(
          "datasets.directIdentifiers.potentialIdentifier",
          "Potential identifier"
        )
      : "");

  if (!hasDirectIdentifierNameEvidence(attribute)) return null;

  return (
    <EvidenceSection
      title={t(
        "datasetAssessments.evidence.directIdentifierEvidence",
        "Direct Identifier Evidence"
      )}
    >
      {hasSummary ? (
        <>
          {classificationLabel && (
            <EvidenceMetricRow
              label={t(
                "datasetAssessments.evidence.classification",
                "Classification"
              )}
              value={classificationLabel}
            />
          )}
          {confidenceLabel && (
            <EvidenceMetricRow
              label={t("datasetAssessments.evidence.confidence", "Confidence")}
              value={confidenceLabel}
            />
          )}
          {sourceLabel && (
            <EvidenceMetricRow
              label={t(
                "datasetAssessments.evidence.evidenceSourceLabel",
                "Evidence source"
              )}
              value={sourceLabel}
            />
          )}
        </>
      ) : (
        <EvidenceLine>
          {t(
            "datasetAssessments.evidence.noAutomaticDirectIdentifierEvidence",
            "No automatic Direct Identifier evidence recorded."
          )}
        </EvidenceLine>
      )}
    </EvidenceSection>
  );
}

export default DirectIdentifierNameEvidence;
