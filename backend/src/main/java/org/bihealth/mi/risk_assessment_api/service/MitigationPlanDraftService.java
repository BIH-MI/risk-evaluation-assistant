package org.bihealth.mi.risk_assessment_api.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner.MitigationPlanDraftRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.CounterfactualContextResultDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.CostEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanActionParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.ProjectCheck;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.SetupEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStrategy;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.enums.ResidualDataRiskState;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/**
 * Evaluates a researcher-constructed draft plan.
 *
 * <p>Candidate plans are researcher-constructed combinations of catalogue actions. REA does not
 * automatically treat all applicable actions as one plan, does not rank plans and never labels a
 * plan safe or optimal. Drafts are not persisted.</p>
 *
 * <p>This service is not an anonymisation engine. Data transformations are proposals: their
 * residual data risk q stays NOT_EVALUATED unless a {@link DataTransformationEvaluator} is
 * available to execute and measure them.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlanDraftService {

    private static final String REQ_TEMPORAL_RESOLUTION = "requiredTemporalResolution";
    private static final String REQ_COHORT_RETENTION = "minimumCohortRetentionPercent";
    private static final String REQ_ANALYSIS_DATA = "analysisDataNeeded";
    private static final String REQ_EXTERNAL_DELIVERABLES = "requiredExternalDeliverables";
    private static final String REQ_CRITICAL_UTILITY = "criticalUtilityRequirement";
    private static final String REQ_BUDGET = "availableBudget";
    private static final String REQ_SETUP_DAYS = "maximumSetupTimeDays";

    private static final String INDIVIDUAL_LEVEL_DATA = "INDIVIDUAL_LEVEL_DATA";
    private static final String AGGREGATE_DATA = "AGGREGATE_DATA";
    private static final String SYNTHETIC_DATA = "SYNTHETIC_DATA";
    private static final String DOWNLOADABLE_DATASET = "ANONYMIZED_DOWNLOADABLE_DATASET";

    private static final String NEXT_STEP_FIX = "Fix plan configuration";
    private static final String NEXT_STEP_REVISE = "Revise plan";

    private final MitigationOpportunityService opportunityService;
    private final CounterfactualContextEvaluator contextEvaluator;
    private final ProjectConstraintCompatibilityService compatibilityService;
    private final DataSharingActivityService activityService;
    // Optional future engine; absent in this milestone, so q remains NOT_EVALUATED.
    private final ObjectProvider<DataTransformationEvaluator> dataTransformationEvaluator;

    public MitigationPlanDraftEvaluationDTO evaluate(
            Long activityId,
            MitigationPlanDraftRequestDTO request,
            String username,
            boolean isAdmin
    ) {
        MitigationPlannerOverviewDTO overview = opportunityService.getOpportunities(
                activityId, username, isAdmin, request.getManualRiskThreshold());
        if (overview.getProject() == null) {
            throw new IllegalArgumentException("A Project is required before mitigation planning can be performed.");
        }
        Set<Long> selectedIds = request.getSelectedActionIds() == null
                ? Set.of() : new LinkedHashSet<>(request.getSelectedActionIds());
        if (selectedIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one mitigation action.");
        }

        Map<Long, Opportunity> available = new LinkedHashMap<>();
        overview.getDataOpportunities().getOpportunities().forEach(o -> available.put(o.getActionId(), o));
        overview.getContextOpportunities().getOpportunities().forEach(o -> available.put(o.getActionId(), o));
        Map<String, ProjectConstraint> constraints = overview.getProjectConstraints().stream()
                .collect(Collectors.toMap(ProjectConstraint::getKey, c -> c, (a, b) -> a));

        MitigationPlanDraftEvaluationDTO plan = new MitigationPlanDraftEvaluationDTO();
        List<String> invalidReasons = new ArrayList<>();
        // One entry per action even when it addresses several findings; traceability is kept in
        // addressedRiskDriverIds instead of duplicating the action.
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
                    PlanActionParameter parameter = resolveParameter(opportunity.getActionId(), definition, request, invalidReasons);
                    unresolvedParameters |= !parameter.isResolved();
                    action.getParameters().add(parameter);
                }
            }
            plan.getActions().add(action);
        }
        plan.getAddressedRiskDriverIds().addAll(addressedDriverIds);

        Double baselineRAnon = overview.getBaselineRisk() == null
                ? null
                : overview.getBaselineRisk().getAnonymizationThreshold();
        List<Long> contextIds = selected.stream()
                .filter(o -> o.getActionType() == MitigationActionType.CONTEXT_CONTROL)
                .map(Opportunity::getActionId)
                .collect(Collectors.toList());
        if (contextIds.isEmpty()) {
            // Selecting a data transformation does not change Impact/T, Controls, Likelihood,
            // P_attack or R_anon: no transformed dataset has been produced or reassessed, and no
            // counterfactual Recipient Assessment is evaluated for data-only plans.
            plan.setBaselineRequiredDataRiskThreshold(baselineRAnon);
            plan.setRequiredDataRiskThreshold(baselineRAnon);
        } else {
            CounterfactualContextResultDTO context = contextEvaluator.evaluate(
                    activityId, contextIds, request.getManualRiskThreshold(), username, isAdmin);
            plan.setCounterfactualContextResult(context);
            plan.getWarnings().addAll(context.getWarnings());
            if (context.getStatus() == CounterfactualContextResultDTO.Status.INVALID) {
                invalidReasons.add(context.getInvalidReason());
            } else {
                plan.setContextActionsApplied(context.isActionsApplied());
                plan.setContextRiskChanged(context.isRiskChanged());
                plan.setBaselineRequiredDataRiskThreshold(context.getBaseline().getRecommendedAnonymizationThreshold());
                plan.setRequiredDataRiskThreshold(context.getProjected().getRecommendedAnonymizationThreshold());
            }
        }
        if (!invalidReasons.isEmpty()) {
            return invalid(plan, invalidReasons);
        }

        evaluateResidualDataRisk(activityId, username, isAdmin, plan);
        aggregateCost(selected, plan);
        aggregateSetup(selected, plan);
        plan.setProjectChecks(buildChecks(plan, constraints));
        plan.setDataRiskEvaluationRequired(requiresDataRiskEvaluation(plan, constraints));
        plan.setProjectConstraintResult(plan.getProjectChecks().stream()
                .map(ProjectCheck::getStatus)
                .reduce(ProjectConstraintResult.PASS, compatibilityService::worst));

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
            MitigationPlanDraftRequestDTO request,
            List<String> invalidReasons
    ) {
        PlanActionParameter parameter = new PlanActionParameter();
        parameter.setParameterCode(definition.getParameterCode());
        String value = request.getSelectedParameters() == null ? null : request.getSelectedParameters().stream()
                .filter(p -> Objects.equals(p.getActionId(), actionId) && p.getParameterCode() == definition.getParameterCode())
                .map(MitigationPlanDraftRequestDTO.SelectedParameter::getValue)
                .filter(v -> v != null && !v.isBlank())
                .findFirst().orElse(null);

        // Only parameters with catalogue-defined values can be resolved now; hierarchies and
        // suppression limits stay unresolved until a concrete transformation exists.
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

    // q is a measurement. It is only reported when an evaluator has actually executed the
    // transformations; otherwise it stays NOT_EVALUATED with a null value (never zero).
    private void evaluateResidualDataRisk(
            Long activityId,
            String username,
            boolean isAdmin,
            MitigationPlanDraftEvaluationDTO plan
    ) {
        DataTransformationEvaluator evaluator = dataTransformationEvaluator.getIfAvailable();
        if (evaluator == null || !hasDataTransformation(plan)) {
            return;
        }
        DataTransformationEvaluator.Result result = evaluator.evaluate(
                activityService.getAccessibleActivityEntity(activityId, username, isAdmin),
                dataActions(plan).collect(Collectors.toList()));
        if (result != null) {
            plan.getResidualDataRisk().setState(ResidualDataRiskState.EVALUATED);
            plan.getResidualDataRisk().setValue(result.residualDataRisk());
        }
    }

    // ------------------------------------------------------------------
    // Operational estimates
    // ------------------------------------------------------------------

    // Costs are aggregated only when every action has a complete estimate in one currency and one
    // scope; otherwise the plan estimate is partial. Missing values are never treated as zero.
    private void aggregateCost(List<Opportunity> selected, MitigationPlanDraftEvaluationDTO plan) {
        CostEstimate cost = plan.getCostEstimate();
        List<OperationalEstimate> estimates = selected.stream().map(Opportunity::getEstimate).collect(Collectors.toList());
        if (estimates.stream().noneMatch(e -> e.getCostMin() != null || e.getCostMax() != null)) {
            cost.setAvailability(EstimateAvailability.UNKNOWN);
            return;
        }
        boolean complete = estimates.stream()
                .allMatch(e -> (e.getCostMin() != null || e.getCostMax() != null) && e.getCurrency() != null);
        if (!complete) {
            cost.setAvailability(EstimateAvailability.PARTIAL);
            cost.setNote("Only some selected actions have a cost estimate; missing estimates are not treated as zero.");
            return;
        }
        boolean sameCurrency = estimates.stream().map(e -> e.getCurrency().toUpperCase(Locale.ROOT)).distinct().count() == 1;
        boolean sameScope = estimates.size() == 1
                || (estimates.stream().allMatch(e -> e.getEstimateScope() != null)
                        && estimates.stream().map(OperationalEstimate::getEstimateScope).distinct().count() == 1);
        if (!sameCurrency || !sameScope) {
            cost.setAvailability(EstimateAvailability.PARTIAL);
            cost.setNote("Estimates differ in currency or scope and are not aggregated.");
            return;
        }
        BigDecimal min = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        for (OperationalEstimate estimate : estimates) {
            min = min.add(estimate.getCostMin() != null ? estimate.getCostMin() : estimate.getCostMax());
            max = max.add(estimate.getCostMax() != null ? estimate.getCostMax() : estimate.getCostMin());
        }
        cost.setAvailability(EstimateAvailability.KNOWN);
        cost.setMin(min);
        cost.setMax(max);
        cost.setCurrency(estimates.get(0).getCurrency().toUpperCase(Locale.ROOT));
    }

    // Setup time is conservatively summed when every selected action has a configured range.
    // Missing setup estimates remain unknown and are never treated as zero.
    private void aggregateSetup(List<Opportunity> selected, MitigationPlanDraftEvaluationDTO plan) {
        SetupEstimate setup = plan.getSetupEstimate();
        List<OperationalEstimate> estimates = selected.stream().map(Opportunity::getEstimate).collect(Collectors.toList());
        if (estimates.stream().noneMatch(e -> e.getSetupDaysMin() != null || e.getSetupDaysMax() != null)) {
            setup.setAvailability(EstimateAvailability.UNKNOWN);
            return;
        }
        boolean complete = estimates.stream().allMatch(e -> e.getSetupDaysMin() != null || e.getSetupDaysMax() != null);
        if (!complete) {
            setup.setAvailability(EstimateAvailability.PARTIAL);
            setup.setNote("Only some selected actions have a setup-time estimate; missing estimates are not treated as zero.");
            return;
        }
        int min = 0;
        int max = 0;
        for (OperationalEstimate estimate : estimates) {
            min += estimate.getSetupDaysMin() != null ? estimate.getSetupDaysMin() : estimate.getSetupDaysMax();
            max += estimate.getSetupDaysMax() != null ? estimate.getSetupDaysMax() : estimate.getSetupDaysMin();
        }
        setup.setAvailability(EstimateAvailability.KNOWN);
        setup.setMinDays(min);
        setup.setMaxDays(max);
    }

    // ------------------------------------------------------------------
    // Deterministic Project checks
    // ------------------------------------------------------------------

    private List<ProjectCheck> buildChecks(MitigationPlanDraftEvaluationDTO plan, Map<String, ProjectConstraint> constraints) {
        List<ProjectCheck> checks = new ArrayList<>();
        budgetCheck(plan, constraints.get(REQ_BUDGET)).ifPresent(checks::add);
        setupCheck(plan, constraints.get(REQ_SETUP_DAYS)).ifPresent(checks::add);
        analysisDataNeededCheck(plan, constraints.get(REQ_ANALYSIS_DATA)).ifPresent(checks::add);
        externalDeliverableCheck(plan, constraints.get(REQ_EXTERNAL_DELIVERABLES)).ifPresent(checks::add);
        temporalCheck(plan, constraints.get(REQ_TEMPORAL_RESOLUTION)).ifPresent(checks::add);
        cohortCheck(plan, constraints.get(REQ_COHORT_RETENTION)).ifPresent(checks::add);
        criticalUtilityCheck(constraints.get(REQ_CRITICAL_UTILITY)).ifPresent(checks::add);
        return checks;
    }

    private Optional<ProjectCheck> budgetCheck(MitigationPlanDraftEvaluationDTO plan, ProjectConstraint requirement) {
        if (requirement == null) {
            return Optional.empty();
        }
        String currency = requirement.getUnit();
        BigDecimal budget = new BigDecimal(requirement.getValue());
        ProjectCheck check = check(requirement, money(currency, budget));
        CostEstimate cost = plan.getCostEstimate();
        if (cost.getAvailability() != EstimateAvailability.KNOWN) {
            check.setPlanEvidence(cost.getAvailability() == EstimateAvailability.PARTIAL ? "Incomplete estimate" : "Unknown cost");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote(cost.getNote());
        } else if (currency == null || !currency.equalsIgnoreCase(cost.getCurrency())) {
            check.setPlanEvidence(rangeText(cost.getCurrency(), cost.getMin(), cost.getMax()));
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("The estimate currency differs from the Project budget currency.");
        } else {
            check.setPlanEvidence(rangeText(cost.getCurrency(), cost.getMin(), cost.getMax()));
            check.setStatus(compatibilityService.compareRangeWithLimit(cost.getMin(), cost.getMax(), budget));
        }
        return Optional.of(check);
    }

    private Optional<ProjectCheck> setupCheck(MitigationPlanDraftEvaluationDTO plan, ProjectConstraint requirement) {
        if (requirement == null) {
            return Optional.empty();
        }
        BigDecimal limit = new BigDecimal(requirement.getValue());
        ProjectCheck check = check(requirement, "≤ " + limit.stripTrailingZeros().toPlainString() + " days");
        SetupEstimate setup = plan.getSetupEstimate();
        if (setup.getAvailability() != EstimateAvailability.KNOWN) {
            check.setPlanEvidence(setup.getAvailability() == EstimateAvailability.PARTIAL ? "Incomplete estimate" : "Unknown setup time");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote(setup.getNote());
        } else {
            check.setPlanEvidence(setup.getMinDays().equals(setup.getMaxDays())
                    ? setup.getMaxDays() + " days" : setup.getMinDays() + "–" + setup.getMaxDays() + " days");
            check.setStatus(compatibilityService.compareRangeWithLimit(
                    BigDecimal.valueOf(setup.getMinDays()), BigDecimal.valueOf(setup.getMaxDays()), limit));
        }
        return Optional.of(check);
    }

    // "Data needed for analysis" describes the analysis input, which may stay inside a secure
    // environment. It is decided only from explicit resultingDataForm catalogue metadata.
    private Optional<ProjectCheck> analysisDataNeededCheck(MitigationPlanDraftEvaluationDTO plan, ProjectConstraint requirement) {
        if (requirement == null) {
            return Optional.empty();
        }
        Set<String> required = values(requirement);
        ProjectCheck check = check(requirement, formatValues(required));

        if (!hasDataTransformation(plan)) {
            if (required.size() == 1 && required.contains(SYNTHETIC_DATA)) {
                check.setPlanEvidence("No synthetic data produced");
                check.setStatus(ProjectConstraintResult.FAIL);
            } else {
                check.setPlanEvidence("No data transformation; representation unchanged");
                check.setStatus(ProjectConstraintResult.PASS);
            }
            return Optional.of(check);
        }

        Optional<MitigationResultingDataForm> form = resultingDataForm(plan);
        if (form.isEmpty()) {
            check.setPlanEvidence("Resulting data form not configured");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("Data-transformation actions require explicit resulting-data-form metadata.");
            return Optional.of(check);
        }

        MitigationResultingDataForm resulting = form.get();
        if (required.contains(INDIVIDUAL_LEVEL_DATA)) {
            if (resulting == MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL) {
                check.setPlanEvidence("Individual-level structure retained");
                check.setStatus(ProjectConstraintResult.PASS);
            } else {
                check.setPlanEvidence(resulting == MitigationResultingDataForm.AGGREGATED
                        ? "Aggregate-only representation"
                        : "Synthetic representation");
                check.setStatus(ProjectConstraintResult.FAIL);
                check.setNote("The Project explicitly requires individual-level data for analysis.");
            }
        } else if (required.contains(SYNTHETIC_DATA)) {
            boolean synthetic = resulting == MitigationResultingDataForm.SYNTHETIC;
            check.setPlanEvidence(synthetic ? "Synthetic representation produced" : "Synthetic representation not produced");
            check.setStatus(synthetic ? ProjectConstraintResult.PASS : ProjectConstraintResult.FAIL);
        } else if (required.contains(AGGREGATE_DATA)) {
            check.setPlanEvidence(resulting == MitigationResultingDataForm.AGGREGATED
                    ? "Aggregate representation produced"
                    : "Representation can support aggregate analysis");
            check.setStatus(ProjectConstraintResult.PASS);
        } else {
            check.setPlanEvidence("Requirement value not recognized");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
        }
        return Optional.of(check);
    }

    // The external deliverable is what leaves the environment. Aggregate outputs do not require
    // downloadable record-level data, so a secure-analysis plan is not failed for lacking one.
    private Optional<ProjectCheck> externalDeliverableCheck(MitigationPlanDraftEvaluationDTO plan, ProjectConstraint requirement) {
        if (requirement == null) {
            return Optional.empty();
        }
        Set<String> deliverables = values(requirement);
        ProjectCheck check = check(requirement, formatValues(deliverables));
        if (!deliverables.contains(DOWNLOADABLE_DATASET)) {
            check.setPlanEvidence("Compatible; no downloadable record-level data required");
            check.setStatus(ProjectConstraintResult.PASS);
            return Optional.of(check);
        }

        Optional<MitigationResultingDataForm> form = resultingDataForm(plan);
        if (form.isEmpty()) {
            check.setPlanEvidence("Resulting data form not configured");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("The downloadable-dataset requirement cannot be checked without data-form metadata.");
        } else if (form.get() == MitigationResultingDataForm.AGGREGATED) {
            check.setPlanEvidence("Aggregate output only");
            check.setStatus(ProjectConstraintResult.FAIL);
            check.setNote("The Project requires an anonymized downloadable dataset.");
        } else if (plan.getResidualDataRisk().getState() == ResidualDataRiskState.EVALUATED) {
            check.setPlanEvidence("Residual risk measured");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("Compare the measured residual risk q with the required data-risk threshold R_anon.");
        } else {
            check.setPlanEvidence(hasDataTransformation(plan)
                    ? "Residual risk not evaluated"
                    : "No data transformation; residual risk not evaluated");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("Residual re-identification risk must be measured before the transformed record-level "
                    + "data can be considered an anonymized downloadable dataset.");
        }
        return Optional.of(check);
    }

    private Optional<ProjectCheck> temporalCheck(MitigationPlanDraftEvaluationDTO plan, ProjectConstraint requirement) {
        if (requirement == null || "NOT_REQUIRED".equalsIgnoreCase(requirement.getValue())) {
            return Optional.empty();
        }
        ProjectCheck check = check(requirement, titleCase(requirement.getValue()));
        Optional<PlanActionParameter> resolution = parameters(plan, MitigationParameterCode.TARGET_RESOLUTION).findFirst();
        if (resolution.isEmpty()) {
            check.setPlanEvidence("Original precision retained");
            check.setStatus(ProjectConstraintResult.PASS);
        } else if (!resolution.get().isResolved()) {
            check.setPlanEvidence("Not selected");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("Select a target resolution to check it against the Project requirement.");
        } else {
            check.setPlanEvidence(titleCase(resolution.get().getValue()));
            check.setStatus(fromParameterCompatibility(resolution.get().getCompatibility()));
        }
        return Optional.of(check);
    }

    // Record suppression and participant retention are not equivalent (for example with repeated
    // or longitudinal records), so retention is only PASS when every action explicitly preserves
    // records; otherwise it has to be measured after transformation.
    private Optional<ProjectCheck> cohortCheck(MitigationPlanDraftEvaluationDTO plan, ProjectConstraint requirement) {
        if (requirement == null) {
            return Optional.empty();
        }
        ProjectCheck check = check(requirement, requirement.getValue() + "%");
        if (!hasDataTransformation(plan)) {
            check.setPlanEvidence("No data transformation; records unchanged");
            check.setStatus(ProjectConstraintResult.PASS);
        } else if (dataActions(plan).anyMatch(action -> action.getRecordRetentionEffect() == null)) {
            check.setPlanEvidence("Record-retention effect not configured");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("The catalogue action needs explicit record-retention metadata before this can be checked.");
        } else if (dataActions(plan).anyMatch(action -> action.getRecordRetentionEffect() == MitigationRecordRetentionEffect.MAY_REMOVE_RECORDS)) {
            check.setPlanEvidence("Records may be removed; needs measurement");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote("Participant retention can only be measured after the transformation has been executed.");
        } else {
            check.setPlanEvidence("Records retained");
            check.setStatus(ProjectConstraintResult.PASS);
        }
        return Optional.of(check);
    }

    private Optional<ProjectCheck> criticalUtilityCheck(ProjectConstraint requirement) {
        if (requirement == null || requirement.getValue() == null || requirement.getValue().isBlank()) {
            return Optional.empty();
        }
        ProjectCheck check = check(requirement, requirement.getValue());
        check.setPlanEvidence("Needs specialist review");
        check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
        check.setNote("The requirement is free text and cannot be deterministically verified before the transformed data are evaluated.");
        return Optional.of(check);
    }

    private ProjectConstraintResult fromParameterCompatibility(ParameterValueCompatibility compatibility) {
        if (compatibility == ParameterValueCompatibility.COMPATIBLE) {
            return ProjectConstraintResult.PASS;
        }
        return compatibility == ParameterValueCompatibility.INCOMPATIBLE
                ? ProjectConstraintResult.FAIL
                : ProjectConstraintResult.NEEDS_EVALUATION;
    }

    private boolean requiresDataRiskEvaluation(
            MitigationPlanDraftEvaluationDTO plan,
            Map<String, ProjectConstraint> constraints
    ) {
        if (plan.getResidualDataRisk().getState() == ResidualDataRiskState.EVALUATED) {
            return false;
        }
        if (hasDataTransformation(plan)) {
            return true;
        }
        ProjectConstraint deliverable = constraints.get(REQ_EXTERNAL_DELIVERABLES);
        return deliverable != null && values(deliverable).contains(DOWNLOADABLE_DATASET);
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

    private boolean hasDataTransformation(MitigationPlanDraftEvaluationDTO plan) {
        return dataActions(plan).findAny().isPresent();
    }

    private Stream<PlanAction> dataActions(MitigationPlanDraftEvaluationDTO plan) {
        return plan.getActions().stream()
                .filter(action -> action.getActionType() == MitigationActionType.DATA_TRANSFORMATION);
    }

    /**
     * Combined representation of the plan's output. Without data transformations the original
     * individual-level representation is kept; empty means at least one data action lacks
     * explicit metadata, which is never guessed.
     */
    private Optional<MitigationResultingDataForm> resultingDataForm(MitigationPlanDraftEvaluationDTO plan) {
        List<MitigationResultingDataForm> forms = dataActions(plan)
                .map(PlanAction::getResultingDataForm)
                .collect(Collectors.toList());
        if (forms.contains(null)) {
            return Optional.empty();
        }
        if (forms.contains(MitigationResultingDataForm.AGGREGATED)) {
            return Optional.of(MitigationResultingDataForm.AGGREGATED);
        }
        if (forms.contains(MitigationResultingDataForm.SYNTHETIC)) {
            return Optional.of(MitigationResultingDataForm.SYNTHETIC);
        }
        // PRESERVES_INDIVIDUAL_LEVEL and NOT_APPLICABLE keep the record-level representation.
        return Optional.of(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL);
    }

    private Set<String> values(ProjectConstraint requirement) {
        if (requirement == null || requirement.getValue() == null || requirement.getValue().isBlank()) {
            return Set.of();
        }
        return Arrays.stream(requirement.getValue().split(","))
                .map(value -> value.trim().toUpperCase(Locale.ROOT))
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String formatValues(Set<String> values) {
        return values.stream().map(this::titleCase).collect(Collectors.joining(", "));
    }

    private Stream<PlanActionParameter> parameters(MitigationPlanDraftEvaluationDTO plan, MitigationParameterCode code) {
        return plan.getActions().stream().flatMap(a -> a.getParameters().stream()).filter(p -> p.getParameterCode() == code);
    }

    private ProjectCheck check(ProjectConstraint requirement, String required) {
        ProjectCheck check = new ProjectCheck();
        check.setKey(requirement.getKey());
        check.setLabel(requirement.getLabel());
        check.setConstraintType(requirement.getConstraintType());
        check.setRequired(required);
        return check;
    }

    private String rangeText(String currency, BigDecimal min, BigDecimal max) {
        return min.compareTo(max) == 0 ? money(currency, min) : money(currency, min) + "–" + max.stripTrailingZeros().toPlainString();
    }

    private String money(String currency, BigDecimal amount) {
        return (currency == null ? "" : currency + " ") + amount.stripTrailingZeros().toPlainString();
    }

    private String titleCase(String value) {
        String lower = value.toLowerCase(Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
