package org.bihealth.mi.risk_assessment_api.enums;

public enum MeasureType {
    RISK,        // Factors that increase risk (e.g., Invasion of Privacy)
    PROTECTIVE,  // Factors that mitigate risk (e.g., Security Controls, Cost for Adversary)
    ECONOMIC     // Factors related to value (e.g., Commercial Value, Payoff for Adversary)
}