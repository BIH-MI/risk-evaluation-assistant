package org.bihealth.mi.risk_assessment_api.dto.request.report;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Represents the request payload for calculating a total exposure risk score.
 * This DTO provides all the necessary parameters for the risk computation service.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExposureRiskRequestDTO {
    private Integer activityId;
    private Integer reportId;

    // ——— Thresholds ———
    // A specific user-defined max risk (e.g. 0.09) that overrides the category-based default.
    private Double manualRiskThreshold;
}