package org.bihealth.mi.risk_assessment_api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.RiskClassification;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class TotalRiskResponseDTO {
    private Integer activityId;
    private Integer reportId;

    // ——— Context Risk ———
    private Double contextRisk;

    // ——— IP Threshold ———
    private Double ipThreshold;

    // ——— IP Threshold ———
    private Double manualThreshold;

    // ——— Max Data Risk Target ———
    private Double maximumDataRisk;

    // ——— Motives & Capacity (MOTC) ———
    private RiskClassification motivesCapacityClassification;

    // ——— Mitigating Controls (MITC) ———
    private RiskClassification mitigatingControlsClassification;

    // ——— Invasion of Privacy (IP) ———
    private RiskClassification invasionPrivacyClassification;
}