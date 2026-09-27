package org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation;

import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_BUDGET;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_COHORT_RETENTION;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_CRITICAL_UTILITY;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_SETUP_DAYS;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanActionParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStrategy;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan.ParameterSelection;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
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
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlanEvaluator {

    private static final String NEXT_STEP_FIX = "Fix plan configuration";
    private static final String NEXT_STEP_REVISE = "Revise plan";

    private final CounterfactualContextEvaluator contextEvaluator;
    private final MitigationPlanEstimateService estimateService;
    private final ProjectConstraintEvaluationService constraintEvaluationService;

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
        Map<Long, Opportunity> available = availableFromInference(context);
        Map<String, ProjectConstraint> constraints = constraintsByKey(context.projectConstraints());
        List<ParameterSelection> selectedParameters = candidate.parameterSelections();

        Set<Long> selectedIds = new LinkedHashSet<>(candidate.actionIds());
        if (selectedIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one mitigation action.");
        }

        MitigationPlanDraftEvaluationDTO plan = new MitigationPlanDraftEvaluationDTO();
        List<String> invalidReasons = new ArrayList<>();
        List<Opportunity> selected = new ArrayList<>();
        for (Long id : selectedIds) {
            Opportunity opportunity = available.get(id);
            if (opportunity == null) {
                invalidReasons.add("Action " + id + " is not an applicable mitigation action for this activity.");
            } else {
                selected.add(opportunity);
            }
        }
        if (!invalidReasons.isEmpty()) {
            return invalid(plan, invalidReasons);
        }

        plan.setStrategy(deriveStrategy(selected));
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

        MitigationPlannerOverviewDTO.BaselineRisk baselineRisk = context.baselineRisk();
        Double baselineRAnon = baselineRisk == null ? null : baselineRisk.getAnonymizationThreshold();
        List<Long> contextIds = selected.stream()
                .filter(o -> o.getActionType() == MitigationActionType.CONTEXT_CONTROL)
                .map(Opportunity::getActionId)
                .collect(Collectors.toList());
        if (contextIds.isEmpty()) {
            // Data transformations do not change R_anon, and residual q is not estimated here.
            plan.setBaselineRequiredDataRiskThreshold(baselineRAnon);
            plan.setRequiredDataRiskThreshold(baselineRAnon);
        } else {
            CounterfactualContextResultDTO counterfactual = contextEvaluator.evaluate(
                    context.workingMemory(), context.knowledge(), contextIds);
            plan.setCounterfactualContextResult(counterfactual);
            plan.getWarnings().addAll(counterfactual.getWarnings());
            if (counterfactual.getStatus() == CounterfactualContextResultDTO.Status.INVALID) {
                invalidReasons.add(counterfactual.getInvalidReason());
            } else {
                plan.setContextActionsApplied(counterfactual.isActionsApplied());
                plan.setContextRiskChanged(counterfactual.isRiskChanged());
                plan.setBaselineRequiredDataRiskThreshold(counterfactual.getBaseline().getRecommendedAnonymizationThreshold());
                plan.setRequiredDataRiskThreshold(counterfactual.getProjected().getRecommendedAnonymizationThreshold());
            }
        }
        if (!invalidReasons.isEmpty()) {
            return invalid(plan, invalidReasons);
        }

        estimateService.applyEstimates(selected, plan);
        ProjectConstraintEvaluationService.Evaluation constraintEvaluation =
                constraintEvaluationService.evaluate(plan, constraints);
        plan.setProjectChecks(constraintEvaluation.checks());
        plan.setDataRiskEvaluationRequired(constraintEvaluation.dataRiskEvaluationRequired());
        plan.setProjectConstraintResult(constraintEvaluation.result());

        if (plan.getProjectConstraintResult() == ProjectConstraintResult.FAIL) {
            plan.setStatus(MitigationPlanStatus.INCOMPATIBLE);
            plan.setNextStep(NEXT_STEP_REVISE);
            plan.getStatusReasons().add("At least one Project requirement is not met.");
            return plan;
        }
        plan.getRemainingEvaluationItems().addAll(buildRemainingEvaluationItems(plan, unresolvedParameters));
        plan.getStatusReasons().addAll(plan.getRemainingEvaluationItems());
        plan.setNextStep(nextStep(plan));
        plan.setStatus(plan.getRemainingEvaluationItems().isEmpty()
                && plan.getProjectConstraintResult() == ProjectConstraintResult.PASS
                ? MitigationPlanStatus.READY_FOR_REVIEW
                : MitigationPlanStatus.EVALUATION_REQUIRED);
        return plan;
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
        if (plan.isContextActionsApplied()) {
            items.add("Verify the proposed context controls before updating the Recipient Assessment.");
        }
        plan.getProjectChecks().stream()
                .filter(check -> check.getStatus() == ProjectConstraintResult.NEEDS_EVALUATION)
                .map(check -> switch (check.getKey()) {
                    case REQ_COHORT_RETENTION -> "Verify that cohort retention remains acceptable.";
                    case REQ_CRITICAL_UTILITY -> "Review the critical utility requirement with a domain specialist.";
                    case REQ_BUDGET -> "Confirm implementation cost against the Project budget.";
                    case REQ_SETUP_DAYS -> "Confirm setup time against the Project limit.";
                    default -> null;
                })
                .filter(Objects::nonNull)
                .forEach(items::add);
        return items.stream().distinct().collect(Collectors.toList());
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

    private Map<String, ProjectConstraint> constraintsByKey(List<ProjectConstraint> constraints) {
        return constraints.stream()
                .collect(Collectors.toMap(
                        ProjectConstraint::getKey,
                        c -> c,
                        (a, b) -> {
                            throw new IllegalStateException("Duplicate Project constraint key: " + a.getKey());
                        },
                        LinkedHashMap::new
                ));
    }
}
