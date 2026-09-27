package org.bihealth.mi.risk_assessment_api.enums;

/**
 * Where the overall target threshold T of a risk result comes from.
 */
public enum RiskThresholdSource {
    // Derived from the risk configuration.
    CONFIGURED,
    // Explicitly overridden by the user on the report.
    MANUAL
}
