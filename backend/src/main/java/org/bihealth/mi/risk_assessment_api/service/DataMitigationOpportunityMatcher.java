package org.bihealth.mi.risk_assessment_api.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataTarget;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableQidCombination;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableRepository;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Matches data-transformation catalogue actions against Dataset Assessment evidence.
 *
 * <p>Applicability is decided only by {@code attributeRole} and {@code dataType} of the
 * catalogue mappings. The deprecated requires* flags are ignored.</p>
 */
@Component
@RequiredArgsConstructor
public class DataMitigationOpportunityMatcher {

    // Same fallbacks as the assessment report for assessments created before scoring systems existed.
    private static final double LEGACY_IDENTIFIABILITY_THRESHOLD = 5;
    private static final double LEGACY_SENSITIVITY_THRESHOLD = 2;

    private final DatasetTableAssessmentAttributeRepository datasetAttributeRepository;
    private final DataSharingActivityTableAssessmentAttributeRepository activityAttributeRepository;
    private final DatasetTableRepository tableRepository;

    /** One assessed dataset column with its role classification. */
    public record AssessedAttribute(
            Long tableId,
            String tableName,
            String name,
            DataType dataType,
            boolean directIdentifier,
            boolean candidateQid,
            boolean sensitive
    ) {}

    /** One retained Candidate QID combination of a single table. */
    public record AssessedCombination(String tableName, List<String> attributeNames) {}

    /** Dataset-side evidence used for applicability; it is not a measured residual risk. */
    public record DatasetEvidence(List<AssessedAttribute> attributes, List<AssessedCombination> combinations) {}

    /**
     * Resolves the effective attribute classification for an activity.
     *
     * <p>Activity-level table overrides replace the Dataset Assessment values when present,
     * mirroring the assessment report. Candidate-QID classification is evidence for
     * applicability; it is not a measured residual re-identification risk.</p>
     */
    public DatasetEvidence resolveEvidence(DataSharingActivity activity, DatasetAssessment assessment) {
        AttributeScoringSystemVersion version = assessment.getAttributeScoringSystemVersion();
        double identifiabilityThreshold = firstNonNull(
                assessment.getAttributeIdentifiabilityThreshold(),
                version == null ? null : version.getDefaultIdentifiabilityThreshold(),
                LEGACY_IDENTIFIABILITY_THRESHOLD);
        double sensitivityThreshold = firstNonNull(
                assessment.getAttributeSensitivityThreshold(),
                version == null ? null : version.getDefaultSensitivityThreshold(),
                LEGACY_SENSITIVITY_THRESHOLD);

        List<AssessedAttribute> attributes = new ArrayList<>();
        List<DataSharingActivityTableAssessmentAttribute> overrides =
                activityAttributeRepository.findAllForActivity(activity.getId());
        if (!overrides.isEmpty()) {
            for (DataSharingActivityTableAssessmentAttribute override : overrides) {
                addAttribute(attributes, override.getTableAssessmentAttribute().getAttribute(),
                        override.isDirectIdentifier(), override.getSensitivity(), override.getReplicability(),
                        override.getAvailability(), override.getDistinguishability(),
                        identifiabilityThreshold, sensitivityThreshold);
            }
        } else {
            for (DatasetTableAssessmentAttribute source
                    : datasetAttributeRepository.findAllForDatasetAssessment(assessment.getId())) {
                addAttribute(attributes, source.getAttribute(), source.isDirectIdentifier(),
                        source.getSensitivity(), source.getReplicability(), source.getAvailability(),
                        source.getDistinguishability(), identifiabilityThreshold, sensitivityThreshold);
            }
        }

        Set<Long> tableIds = attributes.stream().map(AssessedAttribute::tableId).collect(Collectors.toSet());
        List<AssessedCombination> combinations = tableIds.isEmpty()
                ? List.of()
                : tableRepository.findRetainedQidCombinations(tableIds).stream()
                        .map(this::toCombination)
                        .collect(Collectors.toList());
        return new DatasetEvidence(attributes, combinations);
    }

    /**
     * Returns one entry per matching action with all of its matched targets, so the UI can
     * render a single action card that expands to the individual attributes.
     */
    public Map<MitigationAction, List<DataTarget>> match(Collection<MitigationAction> actions, DatasetEvidence evidence) {
        Map<MitigationAction, List<DataTarget>> matches = new LinkedHashMap<>();
        for (MitigationAction action : actions) {
            Map<String, DataTarget> targets = new LinkedHashMap<>();
            for (MitigationAttributeMapping mapping : action.getAttributeMappings()) {
                if (mapping.getAttributeRole() == null) {
                    continue;
                }
                if (mapping.getAttributeRole() == MitigationAttributeRole.CANDIDATE_QID_COMBINATION) {
                    matchCombinations(evidence, targets);
                } else {
                    matchAttributes(mapping, evidence, targets);
                }
            }
            if (!targets.isEmpty()) {
                matches.put(action, new ArrayList<>(targets.values()));
            }
        }
        return matches;
    }

    private void matchAttributes(MitigationAttributeMapping mapping, DatasetEvidence evidence, Map<String, DataTarget> targets) {
        for (AssessedAttribute attribute : evidence.attributes()) {
            if (!hasRole(attribute, mapping.getAttributeRole())
                    || (mapping.getDataType() != null && mapping.getDataType() != attribute.dataType())) {
                continue;
            }
            DataTarget target = new DataTarget();
            target.setTableName(attribute.tableName());
            target.setAttributeNames(List.of(attribute.name()));
            target.setAttributeRole(mapping.getAttributeRole());
            target.setDataType(attribute.dataType());
            target.setReason(attribute.name() + " is classified as " + article(mapping.getAttributeRole())
                    + (mapping.getDataType() == null ? "." : " and has datatype " + dataTypeLabel(attribute.dataType()) + "."));
            targets.putIfAbsent(attribute.tableId() + ":" + attribute.name() + ":" + mapping.getAttributeRole(), target);
        }
    }

    private void matchCombinations(DatasetEvidence evidence, Map<String, DataTarget> targets) {
        for (AssessedCombination combination : evidence.combinations()) {
            DataTarget target = new DataTarget();
            target.setTableName(combination.tableName());
            target.setAttributeNames(combination.attributeNames());
            target.setAttributeRole(MitigationAttributeRole.CANDIDATE_QID_COMBINATION);
            // Retained combination evidence does not prove the combination is unsafe.
            target.setReason("This attribute combination was retained as Candidate QID evidence.");
            targets.putIfAbsent(combination.tableName() + ":" + String.join("+", combination.attributeNames()), target);
        }
    }

    private void addAttribute(
            List<AssessedAttribute> attributes,
            DatasetTableAttribute column,
            boolean directIdentifier,
            Double sensitivity,
            Double replicability,
            Double availability,
            Double distinguishability,
            double identifiabilityThreshold,
            double sensitivityThreshold
    ) {
        if (column.isExcluded()) {
            return;
        }
        boolean candidateQid = false;
        boolean sensitive = false;
        if (!directIdentifier) {
            // Scores are never defaulted here: an unscored attribute simply gets no QID/sensitive role.
            if (replicability != null && availability != null && distinguishability != null) {
                candidateQid = replicability + availability + distinguishability > identifiabilityThreshold;
            }
            sensitive = sensitivity != null && sensitivity > sensitivityThreshold;
        }
        attributes.add(new AssessedAttribute(column.getTable().getId(), column.getTable().getName(),
                column.getName(), column.getDataType(), directIdentifier, candidateQid, sensitive));
    }

    private AssessedCombination toCombination(DatasetTableQidCombination combination) {
        List<String> names = combination.getAttributes().stream()
                .sorted((left, right) -> Long.compare(left.getId(), right.getId()))
                .map(DatasetTableAttribute::getName)
                .collect(Collectors.toCollection(ArrayList::new));
        return new AssessedCombination(combination.getTable().getName(), names);
    }

    private boolean hasRole(AssessedAttribute attribute, MitigationAttributeRole role) {
        return switch (role) {
            case DIRECT_IDENTIFIER -> attribute.directIdentifier();
            case CANDIDATE_QID -> attribute.candidateQid();
            case SENSITIVE_ATTRIBUTE -> attribute.sensitive();
            case CANDIDATE_QID_COMBINATION -> false;
        };
    }

    private String article(MitigationAttributeRole role) {
        return switch (role) {
            case DIRECT_IDENTIFIER -> "a Direct Identifier";
            case CANDIDATE_QID -> "a Candidate QID";
            case SENSITIVE_ATTRIBUTE -> "a Sensitive Attribute";
            case CANDIDATE_QID_COMBINATION -> "a Candidate QID combination";
        };
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

    private double firstNonNull(Double first, Double second, double fallback) {
        return first != null ? first : second != null ? second : fallback;
    }
}
