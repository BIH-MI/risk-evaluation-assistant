package org.bihealth.mi.risk_assessment_api.enums;

public enum MeasureType {
    RISK,       // High Score = High Risk (e.g., "Is it public?")
    PROTECTION  // High Score = Low Risk (e.g., "Do you have a firewall?")
}