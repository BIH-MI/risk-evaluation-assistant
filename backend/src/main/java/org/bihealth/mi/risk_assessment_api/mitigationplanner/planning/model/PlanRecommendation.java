package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model;

import java.util.List;

public record PlanRecommendation(
        EvaluatedCandidatePlan recommendedPlan,
        List<EvaluatedCandidatePlan> alternativePlans,
        String selectionReason
) {
}
