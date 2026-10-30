package org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanActionParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.RequirementCheck;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.UnresolvedFinding;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStrategy;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.RequirementCheckResult;
import org.bihealth.mi.risk_assessment_api.enums.RequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan.ParameterSelection;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.requirements.ActivityRequirementEvaluationService;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Evaluates manual or generated mitigation plans without rerunning inference.
 *
 * <p>The evaluator preserves the existing REA boundaries: context plans use the
 * counterfactual context evaluator, while data transformations leave residual
 * q unevaluated and return a follow-up measurement item.</p>
 *
 * <p>Status semantics: INVALID means the plan cannot be evaluated (unknown action, unknown
 * parameter value, conflicting projections); INCOMPATIBLE means a hard Activity requirement
 * fails; EVALUATION_REQUIRED means at least one remaining evaluation item is open;
 * READY_FOR_REVIEW means nothing more can be evaluated before a human review. None of them
 * means safe or approved.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlanEvaluator {

    private static final String NEXT_STEP_FIX = "Fix plan configuration";
    private static final String NEXT_STEP_REVISE = "Revise plan";

    private final CounterfactualContextEvaluator contextEvaluator;
    private final MitigationPlanEstimateService estimateService;
    private final ActivityRequirementEvaluationService requirementEvaluationService;

    public List<MitigationPlanDraftEvaluationDTO> evaluateAll(
            MitigationPlanningContext context,
            List<CandidatePlan> candidates
    ) {
        return candidates.stream()
                .map(candidate -> evaluate(context, candidate))
                .collect(Collectors.toList());
    }

    /**
     * Evaluates one manual or generated plan against the shared planning context.
     * Inference is not rerun; only opportunities already inferred for this run are accepted.
     */
    public MitigationPlanDraftEvaluationDTO evaluate(MitigationPlanningContext context, CandidatePlan candidate) {
        if (candidate.actionIds().isEmpty()) {
            throw new IllegalArgumentException("Select at least one mitigation action.");
        }
        Map<Long, Opportunity> available = availableFromInference(context);
        MitigationPlanDraftEvaluationDTO plan = new MitigationPlanDraftEvaluationDTO();
        List<String> invalidReasons = new ArrayList<>();

        List<Opportunity> selected = selectOpportunities(candidate, available, invalidReasons);
        if (!invalidReasons.isEmpty()) {
            return invalid(plan, invalidReasons);
        }
        plan.setStrategy(deriveStrategy(selected));
        boolean unresolvedParameters = addActions(plan, selected, candidate.parameterSelections(), invalidReasons);
        plan.getUnresolvedCriticalFindings().addAll(
                unresolvedCriticalFindings(context, available, new LinkedHashSet<>(plan.getAddressedRiskDriverIds())));
        applyContextEvaluation(plan, context, selected, invalidReasons);
        if (!invalidReasons.isEmpty()) {
            return invalid(plan, invalidReasons);
        }

        estimateService.applyEstimates(selected, plan);
        applyRequirementChecks(plan, context.requirements());
        if (plan.getRequirementCheckResult() == RequirementCheckResult.FAIL) {
            plan.setStatus(MitigationPlanStatus.INCOMPATIBLE);
            plan.setNextStep(NEXT_STEP_REVISE);
            plan.getStatusReasons().add("At least one Activity requirement is not met.");
            return plan;
        }
        completeForReview(plan, unresolvedParameters);
        return plan;
    }

    /** The inferred opportunities for the selected action ids, in selection order. */
    private List<Opportunity> selectOpportunities(
            CandidatePlan candidate,
            Map<Long, Opportunity> available,
            List<String> invalidReasons
    ) {
        List<Opportunity> selected = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(candidate.actionIds())) {
            Opportunity opportunity = available.get(id);
            if (opportunity == null) {
                invalidReasons.add("Action " + id + " is not an applicable mitigation action for this activity.");
            } else {
                selected.add(opportunity);
            }
        }
        return selected;
    }

    /**
     * Adds one plan action per selected opportunity, with its chosen parameter values, and the
     * Risk Drivers the plan addresses.
     *
     * @return whether any transformation parameter is still unresolved
     */
    private boolean addActions(
            MitigationPlanDraftEvaluationDTO plan,
            List<Opportunity> selected,
            List<ParameterSelection> selectedParameters,
            List<String> invalidReasons
    ) {
        boolean unresolvedParameters = false;
        Set<String> addressedDriverIds = new LinkedHashSet<>();
        for (Opportunity opportunity : selected) {
            PlanAction action = new PlanAction();
            action.setActionId(opportunity.getActionId());
            action.setActionName(opportunity.getActionName());
            action.setActionType(opportunity.getActionType());
            action.setAddressedRiskDriverIds(opportunity.getAddressedRiskDriverIds());
            addressedDriverIds.addAll(opportunity.getAddressedRiskDriverIds());
            if (opportunity instanceof DataOpportunity dataOpportunity) {
                action.setResultingDataForm(dataOpportunity.getResultingDataForm());
                action.setRecordRetentionEffect(dataOpportunity.getRecordRetentionEffect());
                for (PlanParameter definition : dataOpportunity.getParameters()) {
                    PlanActionParameter parameter = resolveParameter(
                            opportunity.getActionId(), definition, selectedParameters, invalidReasons);
                    unresolvedParameters |= !parameter.isResolved();
                    action.getParameters().add(parameter);
                }
            }
            plan.getActions().add(action);
        }
        plan.getAddressedRiskDriverIds().addAll(addressedDriverIds);
        return unresolvedParameters;
    }

    /**
     * Sets the required data-risk threshold R_anon. Data transformations do not change R_anon and
     * residual q is not estimated here; selected context controls are projected with the
     * counterfactual context evaluator.
     */
    private void applyContextEvaluation(
            MitigationPlanDraftEvaluationDTO plan,
            MitigationPlanningContext context,
            List<Opportunity> selected,
            List<String> invalidReasons
    ) {
        List<Long> contextIds = selected.stream()
                .filter(opportunity -> opportunity.getActionType() == MitigationActionType.CONTEXT_CONTROL)
                .map(Opportunity::getActionId)
                .collect(Collectors.toList());
        if (contextIds.isEmpty()) {
            MitigationPlannerOverviewDTO.BaselineRisk baselineRisk = context.baselineRisk();
            Double baselineRAnon = baselineRisk == null ? null : baselineRisk.getAnonymizationThreshold();
            plan.setBaselineRequiredDataRiskThreshold(baselineRAnon);
            plan.setRequiredDataRiskThreshold(baselineRAnon);
            return;
        }

        CounterfactualContextResultDTO counterfactual = contextEvaluator.evaluate(
                context.workingMemory(), context.knowledge(), contextIds);
        plan.setCounterfactualContextResult(counterfactual);
        plan.getWarnings().addAll(counterfactual.getWarnings());
        if (counterfactual.getStatus() == CounterfactualContextResultDTO.Status.INVALID) {
            invalidReasons.add(counterfactual.getInvalidReason());
            return;
        }
        plan.setContextActionsApplied(counterfactual.isActionsApplied());
        plan.setContextRiskChanged(counterfactual.isRiskChanged());
        plan.setBaselineRequiredDataRiskThreshold(counterfactual.getBaseline().getRecommendedAnonymizationThreshold());
        plan.setRequiredDataRiskThreshold(counterfactual.getProjected().getRecommendedAnonymizationThreshold());
    }

    private void applyRequirementChecks(MitigationPlanDraftEvaluationDTO plan, ActivityRequirements requirements) {
        ActivityRequirementEvaluationService.Evaluation evaluation = requirementEvaluationService.evaluate(plan, requirements);
        plan.setRequirementChecks(evaluation.checks());
        plan.setDataRiskEvaluationRequired(evaluation.dataRiskEvaluationRequired());
        plan.setRequirementCheckResult(evaluation.result());
    }

    /** Lists what is still open before review and derives the status and next step. */
    private void completeForReview(MitigationPlanDraftEvaluationDTO plan, boolean unresolvedParameters) {
        plan.getRemainingEvaluationItems().addAll(buildRemainingEvaluationItems(plan, unresolvedParameters));
        plan.getStatusReasons().addAll(plan.getRemainingEvaluationItems());
        if (plan.isContextActionsApplied()) {
            plan.getVerificationSteps().add("After implementation, verify each proposed context control against its "
                    + "verification criteria; only then update the Recipient Assessment.");
        }
        plan.setNextStep(nextStep(plan));
        plan.setStatus(plan.getRemainingEvaluationItems().isEmpty()
                && plan.getRequirementCheckResult() == RequirementCheckResult.PASS
                ? MitigationPlanStatus.READY_FOR_REVIEW
                : MitigationPlanStatus.EVALUATION_REQUIRED);
    }

    private MitigationPlanDraftEvaluationDTO invalid(MitigationPlanDraftEvaluationDTO plan, List<String> reasons) {
        plan.setStatus(MitigationPlanStatus.INVALID);
        plan.setNextStep(NEXT_STEP_FIX);
        plan.setStatusReasons(reasons);
        return plan;
    }

    private MitigationPlanStrategy deriveStrategy(List<Opportunity> selected) {
        boolean data = selected.stream().anyMatch(o -> o.getActionType() == MitigationActionType.DATA_TRANSFORMATION);
        boolean context = selected.stream().anyMatch(o -> o.getActionType() == MitigationActionType.CONTEXT_CONTROL);
        return data && context ? MitigationPlanStrategy.HYBRID
                : data ? MitigationPlanStrategy.DATA : MitigationPlanStrategy.CONTEXT;
    }

    private PlanActionParameter resolveParameter(
            Long actionId,
            PlanParameter definition,
            List<ParameterSelection> selectedParameters,
            List<String> invalidReasons
    ) {
        PlanActionParameter parameter = new PlanActionParameter();
        parameter.setParameterCode(definition.getParameterCode());
        String value = selectedParameters == null ? null : selectedParameters.stream()
                .filter(p -> Objects.equals(p.actionId(), actionId) && p.parameterCode() == definition.getParameterCode())
                .map(ParameterSelection::value)
                .filter(v -> v != null && !v.isBlank())
                .findFirst().orElse(null);

        Optional<ParameterValue> chosen = value == null ? Optional.empty() : definition.getAllowedValues().stream()
                .filter(v -> v.getValue().equalsIgnoreCase(value.trim())).findFirst();
        if (value != null && chosen.isEmpty()) {
            invalidReasons.add("\"" + value + "\" is not an allowed value for " + definition.getParameterCode() + ".");
        }
        if (chosen.isPresent()) {
            parameter.setValue(chosen.get().getValue());
            parameter.setResolved(true);
            parameter.setCompatibility(chosen.get().getCompatibility());
        } else {
            parameter.setResolved(false);
            parameter.setCompatibility(definition.getCompatibility() != null
                    ? definition.getCompatibility() : ParameterValueCompatibility.EVALUATION_REQUIRED);
        }
        return parameter;
    }

    private List<String> buildRemainingEvaluationItems(
            MitigationPlanDraftEvaluationDTO plan,
            boolean unresolvedParameters
    ) {
        List<String> items = new ArrayList<>();
        if (unresolvedParameters) {
            items.add("Define unresolved transformation configuration during data-transformation evaluation.");
        }
        if (plan.isDataRiskEvaluationRequired()) {
            items.add("Measure residual re-identification risk q and compare it with the required data-risk threshold R_anon.");
        }
        plan.getUnresolvedCriticalFindings().stream()
                .filter(UnresolvedFinding::isMitigationAvailable)
                .map(finding -> "Critical finding \"" + finding.getTitle() + "\" is not addressed although an "
                        + "applicable mitigation action exists; add it or document why it is not used.")
                .forEach(items::add);
        plan.getRequirementChecks().stream()
                .filter(check -> check.getStatus() == RequirementCheckResult.FAIL && !isHardConstraint(check))
                .map(check -> "The plan does not meet the Activity preference \"" + check.getRequirement().label()
                        + "\"; confirm this trade-off with the Activity lead.")
                .forEach(items::add);
        plan.getRequirementChecks().stream()
                .filter(check -> check.getStatus() == RequirementCheckResult.NEEDS_EVALUATION)
                .map(check -> switch (check.getRequirement()) {
                    case MINIMUM_COHORT_RETENTION -> "Verify that cohort retention remains acceptable.";
                    case AVAILABLE_BUDGET -> "Confirm implementation cost against the Activity budget.";
                    case MAXIMUM_SETUP_TIME -> "Confirm setup time against the Activity limit.";
                    default -> null;
                })
                .filter(Objects::nonNull)
                .forEach(items::add);
        return items.stream().distinct().collect(Collectors.toList());
    }

    /**
     * Critical findings the plan does not structurally address. Findings without any applicable
     * action stay part of the (baseline or projected) risk result and are listed for the reviewer;
     * only an omitted applicable action becomes a remaining evaluation item.
     */
    private List<UnresolvedFinding> unresolvedCriticalFindings(
            MitigationPlanningContext context,
            Map<Long, Opportunity> available,
            Set<String> addressedDriverIds
    ) {
        Set<String> coverable = available.values().stream()
                .flatMap(opportunity -> opportunity.getAddressedRiskDriverIds().stream())
                .collect(Collectors.toSet());
        return Stream.concat(
                        context.inference().dataRiskDrivers().stream(),
                        context.inference().contextRiskDrivers().stream())
                .filter(driver -> driver.getPriority() == RiskDriverPriority.CRITICAL)
                .filter(driver -> !addressedDriverIds.contains(driver.getId()))
                .map(driver -> toUnresolvedFinding(driver, coverable.contains(driver.getId())))
                .collect(Collectors.toList());
    }

    private UnresolvedFinding toUnresolvedFinding(RiskDriverDTO driver, boolean mitigationAvailable) {
        UnresolvedFinding finding = new UnresolvedFinding();
        finding.setRiskDriverId(driver.getId());
        finding.setCategoryCode(driver.getCategoryCode());
        finding.setCategoryLabel(driver.getCategoryLabel());
        boolean questionFinding = driver.getQuestionText() != null;
        finding.setTitle(questionFinding ? driver.getQuestionText() : String.join(" + ", driver.getAttributeNames()));
        finding.setCurrentState(questionFinding
                ? driver.getSelectedOptionText()
                : driver.getAttributeRole() == null ? null : driver.getAttributeRole().name());
        finding.setMitigationAvailable(mitigationAvailable);
        finding.setReason(mitigationAvailable
                ? "An applicable mitigation action exists but is not part of this plan."
                : "No configured mitigation action is applicable to this finding; it remains part of the risk "
                        + "calculation for this plan.");
        return finding;
    }

    private boolean isHardConstraint(RequirementCheck check) {
        return check.getConstraintType() == RequirementConstraintType.HARD_CONSTRAINT;
    }

    private String nextStep(MitigationPlanDraftEvaluationDTO plan) {
        return switch (plan.getStrategy()) {
            case DATA -> "Evaluate transformed data";
            case CONTEXT -> plan.isContextRiskChanged()
                    ? "Verify proposed controls"
                    : "Review or strengthen context controls";
            case HYBRID -> "Evaluate transformed data and verify controls";
        };
    }

    private Map<Long, Opportunity> availableFromInference(MitigationPlanningContext context) {
        Map<Long, Opportunity> available = new LinkedHashMap<>();
        Stream.concat(
                        context.inference().dataOpportunities().stream(),
                        context.inference().contextOpportunities().stream())
                .forEach(opportunity -> available.put(opportunity.getActionId(), opportunity));
        return available;
    }
}
