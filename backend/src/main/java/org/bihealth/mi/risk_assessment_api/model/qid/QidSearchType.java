package org.bihealth.mi.risk_assessment_api.model.qid;

/**
 * Search type determines whether QID discovery uses Exact Search, Beam Search,
 * or selects between them automatically from the configured candidate-count
 * threshold.
 */
public enum QidSearchType {
    AUTOMATIC,
    EXACT,
    BEAM
}
