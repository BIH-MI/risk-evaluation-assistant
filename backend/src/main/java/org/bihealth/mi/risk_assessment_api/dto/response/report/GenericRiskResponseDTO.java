package org.bihealth.mi.risk_assessment_api.dto.response.report;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskBand;

import java.util.Map;

/**
 * Response DTO returned by the stateless risk calculation endpoint.
 *
 * <p>The object contains the final anonymization recommendation, the context
 * risk selected by matrix rules, the threshold used in the formula, and a
 * per-category breakdown for explanation in the UI.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenericRiskResponseDTO {

    // Activity that was evaluated.
    private Long activityId;

    // Reserved for persisted reports; may be null for stateless calculations.
    private Long reportId;

    // Final R_anonymization result and its categorical label.
    private RiskMetric finalRisk;

    // Context risk/P_attack value selected from the framework matrix.
    private RiskMetric contextRisk;

    // Matrix rule that matched the category classifications.
    private MatrixRule appliedMatrixRule;

    // Re-identification threshold T used by the formula.
    private Double threshold;

    // True when at least one category or answer activated a high-risk trigger.
    private boolean highRiskTriggered;

    // Category-code keyed explanation of each category's normalized score.
    private Map<String, CategoryMetric> categoryBreakdown;

    /**
     * Numeric/categorical pair used for final and context-risk values.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskMetric {
        // Numeric score or percentage value.
        private Double numericValue;

        // Risk band label associated with the numeric value.
        private String categoricalValue;
    }

    /**
     * Per-category metric shown in risk-result breakdowns.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryMetric {
        // Normalized score for the category.
        private Double numericValue;

        // Matched risk band label.
        private String categoricalValue;

        // Matched band range for display.
        private Double bandMin;
        private Double bandMax;

        // Whether any selected answer in this category triggered high risk.
        private Boolean isHighRiskTriggered;

        // Optional answer distribution counts used by explanatory UI widgets.
        private Integer positiveCount;
        private Integer neutralCount;
        private Integer negativeCount;
        private Integer highRiskCount;
    }

    /**
     * Matrix rule selected by the context-risk calculation.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatrixRule {
        // Category-code to band-label conditions that matched.
        private Map<String, String> conditions;

        // Context-risk value emitted by the matrix row.
        private Double contextRisk;
    }
}
