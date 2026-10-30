package org.bihealth.mi.risk_assessment_api.enums;

import com.fasterxml.jackson.annotation.JsonValue;

import static org.bihealth.mi.risk_assessment_api.enums.RequirementConstraintType.HARD_CONSTRAINT;
import static org.bihealth.mi.risk_assessment_api.enums.RequirementConstraintType.PREFERENCE;

/**
 * The sharing requirements a Data Sharing Activity can state, each with a fixed constraint type.
 * The constraint types are those of the built-in Project Templates from which these requirements
 * were moved to the activity.
 *
 * <p>In JSON a requirement is written as the name of the property that holds its value in
 * {@code ActivityRequirementsDTO}, e.g. {@code "availableBudget"}.</p>
 */
public enum ActivityRequirement {
    MAXIMUM_SETUP_TIME("maximumSetupTimeDays", "Maximum Acceptable Setup Time", HARD_CONSTRAINT),
    AVAILABLE_BUDGET("availableBudget", "Available Implementation Budget", HARD_CONSTRAINT),
    REQUIRED_TEMPORAL_RESOLUTION("requiredTemporalResolution", "Required Temporal Resolution", PREFERENCE),
    MINIMUM_COHORT_RETENTION("minimumCohortRetentionPercent", "Minimum Cohort Retention", PREFERENCE),
    ANALYSIS_DATA_NEEDED("analysisDataNeeded", "Data Needed for Analysis", HARD_CONSTRAINT),
    REQUIRED_EXTERNAL_DELIVERABLES("requiredExternalDeliverables", "Required External Deliverables", HARD_CONSTRAINT),
    SHARING_ARRANGEMENT("sharingArrangement", "Sharing Arrangement", HARD_CONSTRAINT);

    private final String propertyName;
    // English name used in planner explanations; the UI translates the property name instead.
    private final String label;
    private final RequirementConstraintType constraintType;

    ActivityRequirement(String propertyName, String label, RequirementConstraintType constraintType) {
        this.propertyName = propertyName;
        this.label = label;
        this.constraintType = constraintType;
    }

    @JsonValue
    public String propertyName() {
        return propertyName;
    }

    public String label() {
        return label;
    }

    public RequirementConstraintType constraintType() {
        return constraintType;
    }
}
