package org.bihealth.mi.risk_assessment_api.enums;

/**
 * Explicit catalogue metadata describing the data representation a transformation produces.
 * Project checks rely on this value and never infer it from action names.
 */
public enum MitigationResultingDataForm {
    PRESERVES_INDIVIDUAL_LEVEL,
    AGGREGATED,
    SYNTHETIC,
    // The action does not change the representation form of the data.
    NOT_APPLICABLE
}
