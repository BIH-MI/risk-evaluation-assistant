package org.bihealth.mi.risk_assessment_api.enums;

public enum MitigationAttributeRole {
    DIRECT_IDENTIFIER,
    CANDIDATE_QID,
    SENSITIVE_ATTRIBUTE,

    /*
     * Compatibility-only value for old Knowledge Base rows.
     * Do not expose it in forms, seeds, or inference; current data actions use CANDIDATE_QID.
     */
    @Deprecated
    CANDIDATE_QID_COMBINATION;

    /** True for roles administrators can use in current data-transformation rules. */
    public boolean isCurrentDataRuleRole() {
        return this == DIRECT_IDENTIFIER
                || this == CANDIDATE_QID
                || this == SENSITIVE_ATTRIBUTE;
    }

    /** True only for compatibility values that must not be used in current rules. */
    public boolean isCompatibilityOnly() {
        return !isCurrentDataRuleRole();
    }
}
