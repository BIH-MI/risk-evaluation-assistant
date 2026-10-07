package org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.classification;

import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.springframework.stereotype.Component;

/**
 * Authoritative classifier for Dataset Assessment attribute roles used by the
 * Mitigation Planner.
 *
 * <p>The classifier deliberately uses only assessor-entered R/A/D values for
 * Potential-QID classification. QID profiling statistics are evidence for the
 * assessor's Distinguishability judgement and are not interpreted here.</p>
 */
@Component
public class DatasetAttributeRiskClassifier {

    // Legacy fallbacks are only for assessments created before threshold fields existed.
    private static final double LEGACY_IDENTIFIABILITY_THRESHOLD = 5.0;
    private static final double LEGACY_SENSITIVITY_THRESHOLD = 2.0;

    public record AttributeThresholds(
            Double identifiabilityThreshold,
            Double sensitivityThreshold
    ) {}

    public record AttributeClassification(
            boolean directIdentifier,
            Double sensitivity,
            boolean sensitive,
            Double replicability,
            Double availability,
            Double distinguishability,
            Double qidScore,
            Double qidThreshold,
            boolean candidateQid
    ) {}

    public AttributeThresholds resolveThresholds(DatasetAssessment assessment) {
        AttributeScoringSystemVersion version = assessment == null
                ? null
                : assessment.getAttributeScoringSystemVersion();
        Double identifiabilityThreshold = firstNonNull(
                assessment == null ? null : assessment.getAttributeIdentifiabilityThreshold(),
                version == null ? null : version.getDefaultIdentifiabilityThreshold(),
                LEGACY_IDENTIFIABILITY_THRESHOLD);
        Double sensitivityThreshold = firstNonNull(
                assessment == null ? null : assessment.getAttributeSensitivityThreshold(),
                version == null ? null : version.getDefaultSensitivityThreshold(),
                LEGACY_SENSITIVITY_THRESHOLD);
        return new AttributeThresholds(identifiabilityThreshold, sensitivityThreshold);
    }

    public AttributeClassification classify(
            boolean directIdentifier,
            Double sensitivity,
            Double replicability,
            Double availability,
            Double distinguishability,
            Double identifiabilityThreshold,
            Double sensitivityThreshold
    ) {
        if (directIdentifier) {
            return new AttributeClassification(
                    true,
                    sensitivity,
                    false,
                    replicability,
                    availability,
                    distinguishability,
                    null,
                    identifiabilityThreshold,
                    false);
        }

        Double qidScore = null;
        boolean candidateQid = false;
        if (replicability != null && availability != null && distinguishability != null) {
            qidScore = replicability + availability + distinguishability;
            candidateQid = identifiabilityThreshold != null && qidScore > identifiabilityThreshold;
        }

        boolean sensitive = sensitivity != null
                && sensitivityThreshold != null
                && sensitivity > sensitivityThreshold;
        return new AttributeClassification(
                false,
                sensitivity,
                sensitive,
                replicability,
                availability,
                distinguishability,
                qidScore,
                identifiabilityThreshold,
                candidateQid);
    }

    private Double firstNonNull(Double first, Double second, double fallback) {
        return first != null ? first : second != null ? second : fallback;
    }
}
