package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;

import java.math.BigDecimal;
import java.util.Set;

public record EvaluatedCandidatePlan(
        CandidatePlan candidate,
        MitigationPlanDraftEvaluationDTO evaluation,
        int criticalDriverCoverage,
        int highDriverCoverage,
        int unresolvedProjectChecks,
        BigDecimal knownCostMax,
        Integer knownSetupDaysMax,
        Set<String> addressedRiskDriverIds,
        String stableActionCodeKey
) {
}
