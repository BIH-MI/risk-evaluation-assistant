package org.bihealth.mi.risk_assessment_api.utils;

import java.util.Locale;

import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;

/**
 * Reads category band labels from a risk result with the same tolerant category lookup as the
 * assessment report.
 */
public final class RiskResultBands {

    private RiskResultBands() {}

    public static String categoryBand(GenericRiskResponseDTO result, String categoryCode) {
        if (result == null || result.getCategoryBreakdown() == null) {
            return null;
        }
        String wanted = comparable(categoryCode);
        return result.getCategoryBreakdown().entrySet().stream()
                .filter(entry -> comparable(entry.getKey()).contains(wanted))
                .map(entry -> entry.getValue().getCategoricalValue())
                .findFirst()
                .orElse(null);
    }

    private static String comparable(String code) {
        return code == null ? "" : code.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
