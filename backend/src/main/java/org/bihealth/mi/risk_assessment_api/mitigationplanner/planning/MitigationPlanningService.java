package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner.MitigationPlanDraftRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO.CandidatePlanDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.RequirementCheckResult;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation.MitigationPlanEvaluator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.explanation.CandidatePlanExplanationBuilder;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.generator.CandidatePlanGenerator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan.ParameterSelection;
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
 * Use cases of the mitigation planner that work with plans. It contains no matching, evaluation
 * or ranking algorithm itself.
 *
 * <p>Automatic planning: planning context (working memory → Knowledge Base snapshot → inference,
 * via {@link MitigationPlanningContextFactory}) → candidate generation → evaluation →
 * deterministic policy selection → explanation. A researcher-assembled draft plan goes through the
 * same evaluator; only the action selection differs.</p>
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

    /**
     * Generates, evaluates and ranks candidate plans: a recommended plan and up to three alternatives.
     *
     * @param manualRiskThreshold target threshold the user set on the report, or null for the configured one
     */
    public MitigationCandidatePlanResponseDTO generateCandidatePlans(
            Long activityId,
            Double manualRiskThreshold,
            String username,
            boolean isAdmin
    ) {
        MitigationPlanningContext context =
                planningContextFactory.create(activityId, username, isAdmin, manualRiskThreshold);

        List<CandidatePlan> candidates = candidatePlanGenerator.generate(context);
        List<String> generationWarnings = generationWarnings(context, candidates);
        List<MitigationPlanDraftEvaluationDTO> evaluations = planEvaluator.evaluateAll(context, candidates);
        List<EvaluatedCandidatePlan> evaluated = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            evaluated.add(toEvaluated(context, candidates.get(i), evaluations.get(i)));
        }

        PlanRecommendation recommendation =
                planSelectionService.select(evaluated, context.knowledge().selectionPolicy());
        MitigationCandidatePlanResponseDTO response = toResponse(context, candidates.size(), recommendation);
        response.getWarnings().addAll(generationWarnings);
        return response;
    }

    /** Evaluates one researcher-assembled plan with the same evaluator as generated candidates. */
    public MitigationPlanDraftEvaluationDTO evaluateDraft(
            Long activityId,
            MitigationPlanDraftRequestDTO request,
            String username,
            boolean isAdmin
    ) {
        List<ParameterSelection> parameters = request.getSelectedParameters() == null
                ? List.of()
                : request.getSelectedParameters().stream()
                .map(selection -> new ParameterSelection(
                        selection.getActionId(), selection.getParameterCode(), selection.getValue()))
                .toList();
        CandidatePlan draft = new CandidatePlan(request.getSelectedActionIds(), parameters);
        MitigationPlanningContext context =
                planningContextFactory.create(activityId, username, isAdmin, request.getManualRiskThreshold());
        return planEvaluator.evaluate(context, draft);
    }

    private List<String> generationWarnings(MitigationPlanningContext context, List<CandidatePlan> candidates) {
        List<String> warnings = new ArrayList<>();
        for (RiskDriverDTO driver : candidatePlanGenerator.uncoverableCriticalDrivers(context)) {
            warnings.add("No plan was generated: Critical finding \"" + driverTitle(driver) + "\" has configured "
                    + "mitigation actions, but none of them is feasible under the Activity constraints.");
        }
        if (candidates.size() >= CandidatePlanGenerator.MAX_CANDIDATES) {
            warnings.add("Candidate generation stopped at " + CandidatePlanGenerator.MAX_CANDIDATES
                    + " plans; the ranking considers only these candidates.");
        }
        return warnings;
    }

    private String driverTitle(RiskDriverDTO driver) {
        return driver.getQuestionText() != null ? driver.getQuestionText() : String.join(" + ", driver.getAttributeNames());
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
                unresolvedRequirementChecks(evaluation),
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

    private int unresolvedRequirementChecks(MitigationPlanDraftEvaluationDTO evaluation) {
        return (int) evaluation.getRequirementChecks().stream()
                .filter(check -> check.getStatus() == RequirementCheckResult.NEEDS_EVALUATION)
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
        dto.setUnresolvedRequirementChecks(plan.unresolvedRequirementChecks());
        dto.setStableActionCodeKey(plan.stableActionCodeKey());
        dto.setPlanSummary(explanationBuilder.summarize(plan,
                actionableDriverIds(context, RiskDriverPriority.CRITICAL).size(),
                actionableDriverIds(context, RiskDriverPriority.HIGH).size()));
        dto.setActionRationales(explanationBuilder.explain(context, plan.candidate()));
        dto.setEvaluation(plan.evaluation());
        return dto;
    }
}
