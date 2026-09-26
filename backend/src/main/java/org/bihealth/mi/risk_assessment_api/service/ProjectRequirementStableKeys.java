package org.bihealth.mi.risk_assessment_api.service;

import java.util.List;

/**
 * Stable keys that connect Project Template requirements to mitigation-planner behavior.
 *
 * <p>The Project Template still owns the requirement definitions and constraint types; these
 * constants are only the planner's contract for finding the corresponding Project responses.</p>
 */
final class ProjectRequirementStableKeys {

    static final String REQ_DATA_ACCESS_DEADLINE = "dataAccessDeadline";
    static final String REQ_SETUP_DAYS = "maximumSetupTimeDays";
    static final String REQ_BUDGET = "availableBudget";
    static final String REQ_BUDGET_SCOPE = "budgetScope";
    static final String REQ_TEMPORAL_RESOLUTION = "requiredTemporalResolution";
    static final String REQ_COHORT_RETENTION = "minimumCohortRetentionPercent";
    static final String REQ_CRITICAL_UTILITY = "criticalUtilityRequirement";
    static final String REQ_ANALYSIS_DATA = "analysisDataNeeded";
    static final String REQ_EXTERNAL_DELIVERABLES = "requiredExternalDeliverables";
    static final String REQ_SHARING_MODEL = "sharingModel";
    static final String REQ_ACCESS_PATTERN = "accessPattern";

    // Project requirements that matter for planning, in display order. Some are preferences or
    // informational planning context rather than hard constraints.
    static final List<String> PLANNER_RELEVANT_REQUIREMENT_KEYS = List.of(
            REQ_DATA_ACCESS_DEADLINE,
            REQ_SETUP_DAYS,
            REQ_BUDGET,
            REQ_BUDGET_SCOPE,
            REQ_TEMPORAL_RESOLUTION,
            REQ_COHORT_RETENTION,
            REQ_CRITICAL_UTILITY,
            REQ_ANALYSIS_DATA,
            REQ_EXTERNAL_DELIVERABLES,
            REQ_SHARING_MODEL,
            REQ_ACCESS_PATTERN
    );

    private ProjectRequirementStableKeys() {
    }
}
