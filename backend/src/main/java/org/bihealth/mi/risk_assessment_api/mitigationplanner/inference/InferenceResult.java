package org.bihealth.mi.risk_assessment_api.mitigationplanner.inference;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ContextOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;

import java.util.List;

public record InferenceResult(
        List<RiskDriverDTO> dataRiskDrivers,
        List<RiskDriverDTO> contextRiskDrivers,
        List<DataOpportunity> dataOpportunities,
        List<ContextOpportunity> contextOpportunities,
        List<String> warnings
) {
}
