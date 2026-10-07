package org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.matcher;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataTarget;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.classification.DatasetAttributeRiskClassifier;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.classification.DatasetAttributeRiskClassifier.AttributeClassification;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.classification.DatasetAttributeRiskClassifier.AttributeThresholds;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Matches data-transformation Knowledge Base actions against Dataset Assessment evidence.
 *
 * <p>Applicability is decided only by the {@code attributeRole} and optional {@code dataType}
 * of the action's attribute mappings (the typed attribute rules). Roles come from the
 * assessor's attribute-level Dataset Assessment; REA does not discover or rank QID
 * combinations, so every target is a single assessed attribute.</p>
 */
@Component
@RequiredArgsConstructor
public class DataMitigationOpportunityMatcher {

    private final DatasetTableAssessmentAttributeRepository datasetAttributeRepository;
    private final DataSharingActivityTableAssessmentAttributeRepository activityAttributeRepository;
    private final DatasetAttributeRiskClassifier classifier;

    /** One assessed dataset column with its role classification. */
    public record AssessedAttribute(
            Long tableId,
            String tableName,
            String name,
            DataType dataType,
            boolean directIdentifier,
            Double replicability,
            Double availability,
            Double distinguishability,
            Double qidScore,
            Double qidThreshold,
            boolean candidateQid,
            Double sensitivity,
            boolean sensitive
    ) {}

    /** Dataset-side evidence used for applicability; it is not a measured residual risk. */
    public record DatasetEvidence(List<AssessedAttribute> attributes) {}

    private record MappingCandidate(
            MitigationAction action,
            MitigationAttributeMapping mapping,
            AssessedAttribute attribute,
            int specificity
    ) {}

    /**
     * Resolves the effective attribute classification for an activity.
     *
     * <p>Activity-level table overrides are merged per Dataset Assessment attribute:
     * overridden attributes use their activity values and non-overridden attributes retain
     * the Dataset Assessment values. Potential-QID classification is evidence for
     * applicability; it is not a measured residual re-identification risk.</p>
     */
    public DatasetEvidence resolveEvidence(DataSharingActivity activity, DatasetAssessment assessment) {
        AttributeThresholds thresholds = classifier.resolveThresholds(assessment);

        List<AssessedAttribute> attributes = new ArrayList<>();
        List<DatasetTableAssessmentAttribute> sourceAttributes =
                datasetAttributeRepository.findAllForDatasetAssessment(assessment.getId());
        List<DataSharingActivityTableAssessmentAttribute> overrides =
                activityAttributeRepository.findAllForActivity(activity.getId());
        Map<Long, DataSharingActivityTableAssessmentAttribute> overridesBySourceId = overrides.stream()
                .filter(override -> override.getTableAssessmentAttribute() != null
                        && override.getTableAssessmentAttribute().getId() != null)
                .collect(Collectors.toMap(
                        override -> override.getTableAssessmentAttribute().getId(),
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new));

        for (DatasetTableAssessmentAttribute source : sourceAttributes) {
            DataSharingActivityTableAssessmentAttribute override = overridesBySourceId.get(source.getId());
            addAttribute(attributes, source.getAttribute(),
                    override == null ? source.isDirectIdentifier() : override.isDirectIdentifier(),
                    override == null ? source.getSensitivity() : override.getSensitivity(),
                    override == null ? source.getReplicability() : override.getReplicability(),
                    override == null ? source.getAvailability() : override.getAvailability(),
                    override == null ? source.getDistinguishability() : override.getDistinguishability(),
                    thresholds);
        }
        return new DatasetEvidence(attributes);
    }

    /**
     * Returns one entry per matching action with all of its matched targets, so the UI can
     * render a single action card that expands to the individual attributes.
     */
    public Map<MitigationAction, List<DataTarget>> match(Collection<MitigationAction> actions, DatasetEvidence evidence) {
        List<MappingCandidate> candidates = new ArrayList<>();
        for (MitigationAction action : actions) {
            for (MitigationAttributeMapping mapping : action.getAttributeMappings()) {
                if (mapping.getAttributeRole() != null && mapping.getAttributeRole().isCurrentDataRuleRole()) {
                    collectCandidates(action, mapping, evidence, candidates);
                }
            }
        }

        Map<String, Integer> maxSpecificityByAttributeRole = new LinkedHashMap<>();
        for (MappingCandidate candidate : candidates) {
            String key = attributeRoleKey(candidate.attribute(), candidate.mapping().getAttributeRole());
            int current = maxSpecificityByAttributeRole.getOrDefault(key, Integer.MIN_VALUE);
            if (candidate.specificity() > current) {
                maxSpecificityByAttributeRole.put(key, candidate.specificity());
            }
        }

        Map<MitigationAction, Map<String, DataTarget>> grouped = new LinkedHashMap<>();
        for (MappingCandidate candidate : candidates) {
            String attributeRoleKey = attributeRoleKey(candidate.attribute(), candidate.mapping().getAttributeRole());
            if (candidate.specificity() < maxSpecificityByAttributeRole.getOrDefault(attributeRoleKey, Integer.MIN_VALUE)) {
                continue;
            }
            grouped.computeIfAbsent(candidate.action(), ignored -> new LinkedHashMap<>())
                    .putIfAbsent(targetKey(candidate), toTarget(candidate.mapping(), candidate.attribute()));
        }

        Map<MitigationAction, List<DataTarget>> matches = new LinkedHashMap<>();
        for (Map.Entry<MitigationAction, Map<String, DataTarget>> entry : grouped.entrySet()) {
            matches.put(entry.getKey(), new ArrayList<>(entry.getValue().values()));
        }
        return matches;
    }

    private void collectCandidates(
            MitigationAction action,
            MitigationAttributeMapping mapping,
            DatasetEvidence evidence,
            List<MappingCandidate> candidates
    ) {
        for (AssessedAttribute attribute : evidence.attributes()) {
            if (!hasRole(attribute, mapping.getAttributeRole())
                    || (mapping.getDataType() != null && mapping.getDataType() != attribute.dataType())) {
                continue;
            }
            candidates.add(new MappingCandidate(action, mapping, attribute, mapping.getDataType() == null ? 0 : 1));
        }
    }

    private DataTarget toTarget(MitigationAttributeMapping mapping, AssessedAttribute attribute) {
        DataTarget target = new DataTarget();
        target.setTableName(attribute.tableName());
        target.setAttributeNames(List.of(attribute.name()));
        target.setAttributeRole(mapping.getAttributeRole());
        target.setDataType(attribute.dataType());
        target.setReplicability(attribute.replicability());
        target.setAvailability(attribute.availability());
        target.setDistinguishability(attribute.distinguishability());
        target.setQidScore(attribute.qidScore());
        target.setQidThreshold(attribute.qidThreshold());
        target.setSensitivity(attribute.sensitivity());
        target.setSensitive(attribute.sensitive());
        target.setReason(reason(mapping, attribute));
        return target;
    }

    private void addAttribute(
            List<AssessedAttribute> attributes,
            DatasetTableAttribute column,
            boolean directIdentifier,
            Double sensitivity,
            Double replicability,
            Double availability,
            Double distinguishability,
            AttributeThresholds thresholds
    ) {
        // "Excluded" only removes a column from subset profiling; the column is still
        // part of the dataset. Direct identifiers are excluded by default, so they must keep their
        // role here or their removal would never be proposed.
        if (column.isExcluded() && !directIdentifier) {
            return;
        }
        AttributeClassification classification = classifier.classify(
                directIdentifier,
                sensitivity,
                replicability,
                availability,
                distinguishability,
                thresholds.identifiabilityThreshold(),
                thresholds.sensitivityThreshold());
        attributes.add(new AssessedAttribute(column.getTable().getId(), column.getTable().getName(),
                column.getName(), column.getDataType(),
                classification.directIdentifier(),
                classification.replicability(),
                classification.availability(),
                classification.distinguishability(),
                classification.qidScore(),
                classification.qidThreshold(),
                classification.candidateQid(),
                classification.sensitivity(),
                classification.sensitive()));
    }

    private boolean hasRole(AssessedAttribute attribute, MitigationAttributeRole role) {
        return switch (role) {
            case DIRECT_IDENTIFIER -> attribute.directIdentifier();
            case CANDIDATE_QID -> attribute.candidateQid();
            case SENSITIVE_ATTRIBUTE -> attribute.sensitive();
            default -> false;
        };
    }

    private String reason(MitigationAttributeMapping mapping, AssessedAttribute attribute) {
        return switch (mapping.getAttributeRole()) {
            case DIRECT_IDENTIFIER -> attribute.name()
                    + " is classified as a Direct Identifier in the Dataset Assessment.";
            case CANDIDATE_QID -> potentialQidReason(mapping, attribute);
            case SENSITIVE_ATTRIBUTE -> attribute.name()
                    + " is classified as a Sensitive Attribute in the Dataset Assessment.";
            default -> throw new IllegalArgumentException("Unsupported attribute role: " + mapping.getAttributeRole());
        };
    }

    private String potentialQidReason(MitigationAttributeMapping mapping, AssessedAttribute attribute) {
        String specificity = mapping.getDataType() == null
                ? " The action uses a wildcard datatype mapping for " + dataTypeLabel(attribute.dataType()) + "."
                : " The attribute datatype is " + dataTypeLabel(attribute.dataType()) + ".";
        return attribute.name() + " is a Potential QID because Replicability " + formatNumber(attribute.replicability())
                + " + Availability " + formatNumber(attribute.availability())
                + " + Distinguishability " + formatNumber(attribute.distinguishability())
                + " = " + formatNumber(attribute.qidScore())
                + ", which exceeds the configured identifiability threshold "
                + formatNumber(attribute.qidThreshold()) + "." + specificity;
    }

    private String attributeRoleKey(AssessedAttribute attribute, MitigationAttributeRole role) {
        return attribute.tableId() + ":" + attribute.name() + ":" + role;
    }

    private String targetKey(MappingCandidate candidate) {
        return attributeRoleKey(candidate.attribute(), candidate.mapping().getAttributeRole())
                + ":" + candidate.mapping().getDataType();
    }

    private String formatNumber(Double value) {
        if (value == null) {
            return "unavailable";
        }
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }

    private String dataTypeLabel(DataType dataType) {
        if (dataType == null) {
            return "unknown";
        }
        return switch (dataType) {
            case DATETIME -> "Date/Time";
            case DATE -> "Date";
            case BOOLEAN -> "Boolean";
            case DECIMAL -> "Decimal";
            case GEOSPATIAL -> "Geospatial";
            case INTEGER -> "Integer";
            case STRING -> "String";
        };
    }
}
