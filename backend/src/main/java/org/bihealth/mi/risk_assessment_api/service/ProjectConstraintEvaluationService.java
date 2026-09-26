package org.bihealth.mi.risk_assessment_api.service;

import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_ANALYSIS_DATA;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_BUDGET;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_COHORT_RETENTION;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_CRITICAL_UTILITY;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_EXTERNAL_DELIVERABLES;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_SETUP_DAYS;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_TEMPORAL_RESOLUTION;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.CostEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanActionParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.ProjectCheck;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.SetupEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.springframework.stereotype.Service;

/**
 * Evaluates a draft mitigation plan against explicit Project requirements.
 *
 * <p>Checks are conservative: unknown transformation results, unknown estimates, and free-text
 * utility requirements produce {@code NEEDS_EVALUATION}; they are never interpreted as pass or
 * zero effort.</p>
 */
@Service
public class ProjectConstraintEvaluationService {

    private static final String INDIVIDUAL_LEVEL_DATA = "INDIVIDUAL_LEVEL_DATA";
    private static final String AGGREGATE_DATA = "AGGREGATE_DATA";
    private static final String SYNTHETIC_DATA = "SYNTHETIC_DATA";
    private static final String DOWNLOADABLE_DATASET = "ANONYMIZED_DOWNLOADABLE_DATASET";

    private final ProjectConstraintCompatibilityService compatibilityService;

    public ProjectConstraintEvaluationService(ProjectConstraintCompatibilityService compatibilityService) {
        this.compatibilityService = compatibilityService;
    }

    public Evaluation evaluate(
            MitigationPlanDraftEvaluationDTO plan,
            Map<String, ProjectConstraint> constraints
    ) {
        List<ProjectCheck> checks = buildChecks(plan, constraints);
        ProjectConstraintResult result = checks.stream()
                .map(ProjectCheck::getStatus)
                .reduce(ProjectConstraintResult.PASS, compatibilityService::worst);
        boolean dataRiskEvaluationRequired = requiresDataRiskEvaluation(plan, constraints);
        return new Evaluation(checks, result, dataRiskEvaluationRequired);
    }

    public record Evaluation(
            List<ProjectCheck> checks,
            ProjectConstraintResult result,
            boolean dataRiskEvaluationRequired
    ) {}

    private List<ProjectCheck> buildChecks(
            MitigationPlanDraftEvaluationDTO plan,
            Map<String, ProjectConstraint> constraints
    ) {
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
        ProjectCheck check = check(requirement, "<= " + limit.stripTrailingZeros().toPlainString() + " days");
        SetupEstimate setup = plan.getSetupEstimate();
        if (setup.getAvailability() != EstimateAvailability.KNOWN) {
            check.setPlanEvidence(setup.getAvailability() == EstimateAvailability.PARTIAL ? "Incomplete estimate" : "Unknown setup time");
            check.setStatus(ProjectConstraintResult.NEEDS_EVALUATION);
            check.setNote(setup.getNote());
        } else {
            check.setPlanEvidence(setup.getMinDays().equals(setup.getMaxDays())
                    ? setup.getMaxDays() + " days" : setup.getMinDays() + "-" + setup.getMaxDays() + " days");
            check.setStatus(compatibilityService.compareRangeWithLimit(
                    BigDecimal.valueOf(setup.getMinDays()), BigDecimal.valueOf(setup.getMaxDays()), limit));
        }
        return Optional.of(check);
    }

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

    private boolean requiresDataRiskEvaluation(
            MitigationPlanDraftEvaluationDTO plan,
            Map<String, ProjectConstraint> constraints
    ) {
        if (hasDataTransformation(plan)) {
            return true;
        }
        ProjectConstraint deliverable = constraints.get(REQ_EXTERNAL_DELIVERABLES);
        return deliverable != null && values(deliverable).contains(DOWNLOADABLE_DATASET);
    }

    private ProjectConstraintResult fromParameterCompatibility(ParameterValueCompatibility compatibility) {
        if (compatibility == ParameterValueCompatibility.COMPATIBLE) {
            return ProjectConstraintResult.PASS;
        }
        return compatibility == ParameterValueCompatibility.INCOMPATIBLE
                ? ProjectConstraintResult.FAIL
                : ProjectConstraintResult.NEEDS_EVALUATION;
    }

    private boolean hasDataTransformation(MitigationPlanDraftEvaluationDTO plan) {
        return dataActions(plan).findAny().isPresent();
    }

    private Stream<PlanAction> dataActions(MitigationPlanDraftEvaluationDTO plan) {
        return plan.getActions().stream()
                .filter(action -> action.getActionType() == MitigationActionType.DATA_TRANSFORMATION);
    }

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
        return Optional.of(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL);
    }

    private Set<String> values(ProjectConstraint requirement) {
        if (requirement == null || requirement.getValue() == null || requirement.getValue().isBlank()) {
            return Set.of();
        }
        return Arrays.stream(requirement.getValue().split(","))
                .map(value -> value.trim().toUpperCase(java.util.Locale.ROOT))
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
        return min.compareTo(max) == 0 ? money(currency, min) : money(currency, min) + "-" + max.stripTrailingZeros().toPlainString();
    }

    private String money(String currency, BigDecimal amount) {
        return (currency == null ? "" : currency + " ") + amount.stripTrailingZeros().toPlainString();
    }

    private String titleCase(String value) {
        String lower = value.toLowerCase(java.util.Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
