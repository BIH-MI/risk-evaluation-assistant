package org.bihealth.mi.risk_assessment_api.model;

import java.util.List;
import java.util.Optional;

/**
 * Unique constraint names for top-level resources with globally unique names.
 */
public final class NamedResourceConstraints {

    public static final String DATASETS_NORMALIZED_NAME = "uk_datasets_normalized_name";
    public static final String RECIPIENTS_NORMALIZED_NAME = "uk_recipients_normalized_name";
    public static final String DATA_SHARING_ACTIVITIES_NORMALIZED_NAME = "uk_data_sharing_activities_normalized_name";
    public static final String RISK_CONFIGURATIONS_NORMALIZED_NAME = "uk_risk_configurations_normalized_name";
    public static final String QID_DISCOVERY_CONFIGURATIONS_NORMALIZED_NAME = "uk_qid_discovery_configurations_normalized_name";
    public static final String ATTRIBUTE_SCORING_SYSTEMS_NORMALIZED_NAME = "uk_attribute_scoring_systems_normalized_name";

    private static final List<ConstraintMatch> CONSTRAINTS = List.of(
            new ConstraintMatch(DATASETS_NORMALIZED_NAME, "dataset", "DATASET_NAME_ALREADY_EXISTS"),
            new ConstraintMatch(RECIPIENTS_NORMALIZED_NAME, "recipient", "ENTITY_NAME_ALREADY_EXISTS"),
            new ConstraintMatch(DATA_SHARING_ACTIVITIES_NORMALIZED_NAME, "data sharing activity", "ENTITY_NAME_ALREADY_EXISTS"),
            new ConstraintMatch(RISK_CONFIGURATIONS_NORMALIZED_NAME, "configuration", "ENTITY_NAME_ALREADY_EXISTS"),
            new ConstraintMatch(QID_DISCOVERY_CONFIGURATIONS_NORMALIZED_NAME, "QID discovery configuration", "ENTITY_NAME_ALREADY_EXISTS"),
            new ConstraintMatch(ATTRIBUTE_SCORING_SYSTEMS_NORMALIZED_NAME, "attribute scoring system", "ENTITY_NAME_ALREADY_EXISTS")
    );

    private NamedResourceConstraints() {
    }

    public static Optional<ConstraintMatch> matchViolationMessage(String message) {
        if (message == null) {
            return Optional.empty();
        }
        return CONSTRAINTS.stream()
                .filter(constraint -> message.contains(constraint.constraintName()))
                .findFirst();
    }

    public record ConstraintMatch(String constraintName, String resourceLabel, String code) {
    }
}
