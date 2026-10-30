package org.bihealth.mi.risk_assessment_api.enums;

/**
 * How strictly the mitigation planner treats an activity requirement. Only a failed hard
 * constraint makes a plan incompatible; an unmet preference is a trade-off that needs review.
 */
public enum RequirementConstraintType {
    HARD_CONSTRAINT,
    PREFERENCE
}
