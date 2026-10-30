package org.bihealth.mi.risk_assessment_api.enums;

/**
 * Researcher-facing outcome of an activity requirement check, used both for individual checks and
 * for the plan-level summary. Unknown information never collapses into PASS.
 */
public enum RequirementCheckResult {
    PASS,
    NEEDS_EVALUATION,
    FAIL
}
