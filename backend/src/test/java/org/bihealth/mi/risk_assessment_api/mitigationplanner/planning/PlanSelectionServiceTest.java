package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.EvaluatedCandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.PlanRecommendation;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.policy.PlanSelectionService;
import org.junit.jupiter.api.Test;

class PlanSelectionServiceTest {

    private final PlanSelectionService service = new PlanSelectionService();

    @Test
    void rejectsIncompatibleAndAppliesCriteriaLexicographically() {
        EvaluatedCandidatePlan incompatible = plan("A", List.of(1L), 1, 2, MitigationPlanStatus.INCOMPATIBLE, Set.of("c", "h1", "h2"));
        EvaluatedCandidatePlan fewerHigh = plan("B", List.of(2L), 1, 1, MitigationPlanStatus.EVALUATION_REQUIRED, Set.of("c", "h1"));
        EvaluatedCandidatePlan moreHigh = plan("C+D", List.of(3L, 4L), 1, 2, MitigationPlanStatus.EVALUATION_REQUIRED, Set.of("c", "h1", "h2"));

        PlanRecommendation recommendation = service.select(List.of(incompatible, fewerHigh, moreHigh), policy());

        assertThat(recommendation.recommendedPlan()).isSameAs(moreHigh);
        assertThat(recommendation.alternativePlans()).containsExactly(fewerHigh);
        assertThat(recommendation.selectionReason()).contains("PREFER_HIGH_DRIVER_COVERAGE");
    }

    @Test
    void skipsAlternativesThatOnlyAddAnUnnecessaryAction() {
        EvaluatedCandidatePlan small = plan("A", List.of(1L), 1, 1, MitigationPlanStatus.EVALUATION_REQUIRED, Set.of("c"));
        EvaluatedCandidatePlan superset = plan("A+B", List.of(1L, 2L), 1, 1, MitigationPlanStatus.EVALUATION_REQUIRED, Set.of("c"));

        PlanRecommendation recommendation = service.select(List.of(superset, small), policy());

        assertThat(recommendation.recommendedPlan()).isSameAs(small);
        assertThat(recommendation.alternativePlans()).isEmpty();
    }

    @Test
    void returnsNoRecommendationWhenNothingFeasible() {
        PlanRecommendation recommendation = service.select(List.of(), policy());

        assertThat(recommendation.recommendedPlan()).isNull();
        assertThat(recommendation.alternativePlans()).isEmpty();
    }

    private PlanSelectionPolicyDefinition policy() {
        PlanSelectionPolicyDefinition policy = new PlanSelectionPolicyDefinition();
        policy.setEnabledCriteria(List.of(
                "REJECT_INVALID",
                "REJECT_INCOMPATIBLE",
                "COVER_ACTIONABLE_CRITICAL_DRIVERS",
                "PREFER_HIGH_DRIVER_COVERAGE",
                "PREFER_FEWER_UNRESOLVED_PROJECT_CHECKS",
                "PREFER_FEWER_ACTIONS",
                "PREFER_LOWER_KNOWN_COST",
                "PREFER_SHORTER_KNOWN_SETUP_TIME",
                "STABLE_ACTION_CODE_TIE_BREAK"));
        return policy;
    }

    private EvaluatedCandidatePlan plan(
            String key,
            List<Long> actionIds,
            int critical,
            int high,
            MitigationPlanStatus status,
            Set<String> drivers
    ) {
        MitigationPlanDraftEvaluationDTO evaluation = new MitigationPlanDraftEvaluationDTO();
        evaluation.setStatus(status);
        actionIds.forEach(id -> evaluation.getActions().add(new PlanAction()));
        return new EvaluatedCandidatePlan(
                new CandidatePlan(actionIds, List.of()), evaluation, critical, high, 0, null, null, drivers, key);
    }
}
