package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner.MitigationCandidatePlanRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO.CandidatePlanDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation.MitigationPlanEvaluator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.explanation.CandidatePlanExplanationBuilder;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.generator.CandidatePlanGenerator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.EvaluatedCandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.PlanRecommendation;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.policy.PlanSelectionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Use-case orchestration for automatic mitigation planning. It contains no matching, evaluation
 * or ranking algorithm itself. One planning run: working memory → Knowledge Base snapshot → inference
 * (once, via {@link MitigationPlanningContextFactory}) → candidate generation →
 * evaluation → deterministic policy selection.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlanningService {

    private final MitigationPlanningContextFactory planningContextFactory;
    private final CandidatePlanGenerator candidatePlanGenerator;
    private final MitigationPlanEvaluator planEvaluator;
    private final PlanSelectionService planSelectionService;
    private final CandidatePlanExplanationBuilder explanationBuilder;

    public MitigationCandidatePlanResponseDTO generate(
            Long activityId,
            MitigationCandidatePlanRequestDTO request,
            String username,
            boolean isAdmin
    ) {
        Double manualRiskThreshold = request == null ? null : request.getManualRiskThreshold();
        MitigationPlanningContext context =
                planningContextFactory.create(activityId, username, isAdmin, manualRiskThreshold);

        List<CandidatePlan> candidates = candidatePlanGenerator.generate(context);
        List<MitigationPlanDraftEvaluationDTO> evaluations = planEvaluator.evaluateAll(context, candidates);
        List<EvaluatedCandidatePlan> evaluated = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            evaluated.add(toEvaluated(context, candidates.get(i), evaluations.get(i)));
        }

        PlanRecommendation recommendation =
                planSelectionService.select(evaluated, context.knowledge().selectionPolicy());
        return toResponse(context, candidates.size(), recommendation);
    }

    private EvaluatedCandidatePlan toEvaluated(
            MitigationPlanningContext context,
            CandidatePlan candidate,
            MitigationPlanDraftEvaluationDTO evaluation
    ) {
        Set<String> addressed = new LinkedHashSet<>(evaluation.getAddressedRiskDriverIds());
        return new EvaluatedCandidatePlan(
                candidate,
                evaluation,
                coverage(context, addressed, RiskDriverPriority.CRITICAL),
                coverage(context, addressed, RiskDriverPriority.HIGH),
                unresolvedProjectChecks(evaluation),
                evaluation.getCostEstimate() == null ? null : evaluation.getCostEstimate().getMax(),
                evaluation.getSetupEstimate() == null ? null : evaluation.getSetupEstimate().getMaxDays(),
                addressed,
                stableActionCodeKey(context, candidate)
        );
    }

    private int coverage(MitigationPlanningContext context, Set<String> addressed, RiskDriverPriority priority) {
        return (int) actionableDriverIds(context, priority).stream().filter(addressed::contains).count();
    }

    private Set<String> actionableDriverIds(MitigationPlanningContext context, RiskDriverPriority priority) {
        return Stream.concat(
                        context.inference().dataRiskDrivers().stream(),
                        context.inference().contextRiskDrivers().stream())
                .filter(RiskDriverDTO::isActionable)
                .filter(driver -> driver.getPriority() == priority)
                .map(RiskDriverDTO::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private int unresolvedProjectChecks(MitigationPlanDraftEvaluationDTO evaluation) {
        return (int) evaluation.getProjectChecks().stream()
                .filter(check -> check.getStatus() == ProjectConstraintResult.NEEDS_EVALUATION)
                .count();
    }

    private String stableActionCodeKey(MitigationPlanningContext context, CandidatePlan candidate) {
        Map<Long, String> codes = opportunityCodes(context);
        return candidate.actionIds().stream()
                .map(codes::get)
                .sorted()
                .collect(Collectors.joining("+"));
    }

    private Map<Long, String> opportunityCodes(MitigationPlanningContext context) {
        Map<Long, String> codes = new LinkedHashMap<>();
        Stream.concat(
                        context.inference().dataOpportunities().stream(),
                        context.inference().contextOpportunities().stream())
                .forEach(opportunity -> codes.put(opportunity.getActionId(), opportunity.getActionCode()));
        return codes;
    }

    private MitigationCandidatePlanResponseDTO toResponse(
            MitigationPlanningContext context,
            int generatedCandidateCount,
            PlanRecommendation recommendation
    ) {
        MitigationCandidatePlanResponseDTO response = new MitigationCandidatePlanResponseDTO();
        response.setKnowledgeBaseId(context.knowledge().knowledgeBaseId());
        response.setKnowledgeBaseName(context.knowledge().knowledgeBaseName());
        response.setKnowledgeBaseVersionId(context.knowledge().versionId());
        response.setKnowledgeBaseVersionNumber(context.knowledge().versionNumber());
        PlanSelectionPolicyDefinition policy = context.knowledge().selectionPolicy();
        if (policy != null) {
            response.setSelectionPolicyName(policy.getPolicyName());
            response.setSelectionCriteria(new ArrayList<>(policy.getEnabledCriteria()));
        }
        response.setSelectionReason(recommendation.selectionReason());
        response.setGeneratedCandidateCount(generatedCandidateCount);
        response.setCriticalDriverTotal(actionableDriverIds(context, RiskDriverPriority.CRITICAL).size());
        response.setHighDriverTotal(actionableDriverIds(context, RiskDriverPriority.HIGH).size());
        response.getWarnings().addAll(context.workingMemory().warnings());
        response.getWarnings().addAll(context.inference().warnings());

        if (recommendation.recommendedPlan() != null) {
            CandidatePlanDTO recommended = toDto("Recommended Plan", context, recommendation.recommendedPlan());
            recommended.setRecommended(true);
            response.setRecommendedPlan(recommended);
        }
        int index = 1;
        for (EvaluatedCandidatePlan alternative : recommendation.alternativePlans()) {
            response.getAlternativePlans().add(toDto("Alternative " + index, context, alternative));
            index++;
        }
        return response;
    }

    private CandidatePlanDTO toDto(String label, MitigationPlanningContext context, EvaluatedCandidatePlan plan) {
        Map<Long, String> codes = opportunityCodes(context);
        CandidatePlanDTO dto = new CandidatePlanDTO();
        dto.setLabel(label);
        dto.setSelectedActionIds(new ArrayList<>(plan.candidate().actionIds()));
        dto.setSelectedActionCodes(plan.candidate().actionIds().stream().map(codes::get).toList());
        dto.setCriticalDriverCoverage(plan.criticalDriverCoverage());
        dto.setHighDriverCoverage(plan.highDriverCoverage());
        dto.setUnresolvedProjectChecks(plan.unresolvedProjectChecks());
        dto.setStableActionCodeKey(plan.stableActionCodeKey());
        dto.setPlanSummary(explanationBuilder.summarize(plan,
                actionableDriverIds(context, RiskDriverPriority.CRITICAL).size(),
                actionableDriverIds(context, RiskDriverPriority.HIGH).size()));
        dto.setActionRationales(explanationBuilder.explain(context, plan.candidate()));
        dto.setEvaluation(plan.evaluation());
        return dto;
    }
}
