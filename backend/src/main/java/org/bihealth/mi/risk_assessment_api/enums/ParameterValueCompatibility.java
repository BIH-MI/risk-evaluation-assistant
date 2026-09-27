package org.bihealth.mi.risk_assessment_api.enums;

/**
 * Result of a simple, deterministic comparison between a catalogue parameter
 * value and an explicit Project constraint.
 */
public enum ParameterValueCompatibility {
    COMPATIBLE,
    INCOMPATIBLE,
    EVALUATION_REQUIRED
}
