package org.bihealth.mi.risk_assessment_api.utils;

import java.util.Locale;

import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO.CategoryMetric;

/**
 * Reads category results from a risk result with the same tolerant category lookup as the
 * assessment report.
 */
public final class RiskResultBands {

    private RiskResultBands() {}

    public static String categoryBand(GenericRiskResponseDTO result, String categoryCode) {
        CategoryMetric metric = categoryMetric(result, categoryCode);
        return metric == null ? null : metric.getCategoricalValue();
    }

    /** Whether RiskComputationService applied the high-risk-trigger override to the category. */
    public static boolean highRiskTriggered(GenericRiskResponseDTO result, String categoryCode) {
        CategoryMetric metric = categoryMetric(result, categoryCode);
        return metric != null && Boolean.TRUE.equals(metric.getIsHighRiskTriggered());
    }

    public static CategoryMetric categoryMetric(GenericRiskResponseDTO result, String categoryCode) {
        if (result == null || result.getCategoryBreakdown() == null) {
            return null;
        }
        String wanted = comparable(categoryCode);
        return result.getCategoryBreakdown().entrySet().stream()
                .filter(entry -> comparable(entry.getKey()).contains(wanted))
                .map(java.util.Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private static String comparable(String code) {
        return code == null ? "" : code.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
