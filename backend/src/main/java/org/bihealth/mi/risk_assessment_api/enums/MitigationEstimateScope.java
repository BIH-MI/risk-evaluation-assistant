package org.bihealth.mi.risk_assessment_api.enums;

/** What a Knowledge Base cost estimate covers. */
public enum MitigationEstimateScope {
    SETUP_ONLY,
    SINGLE_SHARING_ACTIVITY,
    // The entire research project, not only one sharing activity.
    WHOLE_PROJECT,
    ANNUAL_OPERATION
}
