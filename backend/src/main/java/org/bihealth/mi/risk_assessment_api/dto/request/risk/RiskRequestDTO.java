package org.bihealth.mi.risk_assessment_api.dto.request.risk;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Represents the request payload for calculating a total exposure risk score.
 *
 * <p>The calculation is stateless: the activity ID identifies the saved dataset
 * and recipient assessments, and an optional manual threshold can override the
 * configured threshold for what-if analysis.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RiskRequestDTO {
    // DataSharingActivity whose linked assessments should be calculated.
    private Long activityId;

    // Optional threshold override; null means use the configuration threshold.
    private Double manualRiskThreshold;
}
