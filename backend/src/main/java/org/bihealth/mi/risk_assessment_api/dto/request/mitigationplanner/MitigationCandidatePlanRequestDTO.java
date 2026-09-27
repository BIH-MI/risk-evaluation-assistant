package org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MitigationCandidatePlanRequestDTO {
    private Double manualRiskThreshold;
}
