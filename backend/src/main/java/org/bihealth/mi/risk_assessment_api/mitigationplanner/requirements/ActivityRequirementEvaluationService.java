package org.bihealth.mi.risk_assessment_api.mitigationplanner.requirements;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.CostEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanActionParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.RequirementCheck;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.SetupEstimate;
import org.bihealth.mi.risk_assessment_api.enums.ActivityRequirement;
import org.bihealth.mi.risk_assessment_api.enums.AnalysisDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ExternalDeliverable;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.RequirementCheckResult;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.springframework.stereotype.Service;

/**
 * Evaluates a draft mitigation plan against the requirements of its Data Sharing Activity.
 *
 * <p>Checks are conservative: unknown transformation results and unknown estimates produce
 * {@code NEEDS_EVALUATION}; they are never interpreted as pass or zero effort.</p>
 *
 * <p>Each check reports its own outcome, including FAIL for an unmet preference. Only a failing
 * hard constraint makes the plan-level result FAIL (and the plan INCOMPATIBLE); an unmet
 * preference is a trade-off that needs a decision, so it contributes NEEDS_EVALUATION.</p>
 */
@Service
public class ActivityRequirementEvaluationService {

    private final ActivityRequirementCompatibilityService compatibilityService;

    public ActivityRequirementEvaluationService(ActivityRequirementCompatibilityService compatibilityService) {
        this.compatibilityService = compatibilityService;
    }

    public record Evaluation(
            List<RequirementCheck> checks,
            RequirementCheckResult result,
            boolean dataRiskEvaluationRequired
    ) {}

    public Evaluation evaluate(MitigationPlanDraftEvaluationDTO plan, ActivityRequirements requirements) {
        List<RequirementCheck> checks = new ArrayList<>();
        budgetCheck(plan, requirements).ifPresent(checks::add);
        setupCheck(plan, requirements.getMaximumSetupTimeDays()).ifPresent(checks::add);
        analysisDataNeededCheck(plan, requirements.getAnalysisDataNeeded()).ifPresent(checks::add);
        externalDeliverableCheck(plan, requirements.getRequiredExternalDeliverables()).ifPresent(checks::add);
        temporalCheck(plan, requirements.getRequiredTemporalResolution()).ifPresent(checks::add);
        cohortCheck(plan, requirements.getMinimumCohortRetentionPercent()).ifPresent(checks::add);

        RequirementCheckResult result = checks.stream()
                .map(check -> compatibilityService.planLevelResult(check.getStatus(), check.getRequirement()))
                .reduce(RequirementCheckResult.PASS, compatibilityService::worst);
        boolean dataRiskEvaluationRequired = hasDataTransformation(plan)
                || requirements.getRequiredExternalDeliverables().contains(ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET);
        return new Evaluation(checks, result, dataRiskEvaluationRequired);
    }

    private Optional<RequirementCheck> budgetCheck(MitigationPlanDraftEvaluationDTO plan, ActivityRequirements requirements) {
        BigDecimal budget = requirements.getAvailableBudget();
        if (budget == null) {
            return Optional.empty();
        }
        String currency = requirements.getBudgetCurrency();
        RequirementCheck check = check(ActivityRequirement.AVAILABLE_BUDGET, money(currency, budget));
        CostEstimate cost = plan.getCostEstimate();
        if (cost.getAvailability() != EstimateAvailability.KNOWN) {
            check.setPlanEvidence(cost.getAvailability() == EstimateAvailability.PARTIAL ? "Incomplete estimate" : "Unknown cost");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote(cost.getNote());
        } else if (currency == null || !currency.equalsIgnoreCase(cost.getCurrency())) {
            check.setPlanEvidence(rangeText(cost.getCurrency(), cost.getMin(), cost.getMax()));
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("The estimate currency differs from the Activity budget currency.");
        } else {
            check.setPlanEvidence(rangeText(cost.getCurrency(), cost.getMin(), cost.getMax()));
            check.setStatus(compatibilityService.compareRangeWithLimit(cost.getMin(), cost.getMax(), budget));
        }
        return Optional.of(check);
    }

    private Optional<RequirementCheck> setupCheck(MitigationPlanDraftEvaluationDTO plan, Integer maximumSetupDays) {
        if (maximumSetupDays == null) {
            return Optional.empty();
        }
        RequirementCheck check = check(ActivityRequirement.MAXIMUM_SETUP_TIME, "<= " + maximumSetupDays + " days");
        SetupEstimate setup = plan.getSetupEstimate();
        if (setup.getAvailability() != EstimateAvailability.KNOWN) {
            check.setPlanEvidence(setup.getAvailability() == EstimateAvailability.PARTIAL ? "Incomplete estimate" : "Unknown setup time");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote(setup.getNote());
        } else {
            check.setPlanEvidence(setup.getMinDays().equals(setup.getMaxDays())
                    ? setup.getMaxDays() + " days" : setup.getMinDays() + "-" + setup.getMaxDays() + " days");
            check.setStatus(compatibilityService.compareRangeWithLimit(
                    BigDecimal.valueOf(setup.getMinDays()),
                    BigDecimal.valueOf(setup.getMaxDays()),
                    BigDecimal.valueOf(maximumSetupDays)));
        }
        return Optional.of(check);
    }

    private Optional<RequirementCheck> analysisDataNeededCheck(MitigationPlanDraftEvaluationDTO plan, Set<AnalysisDataForm> required) {
        if (required.isEmpty()) {
            return Optional.empty();
        }
        RequirementCheck check = check(ActivityRequirement.ANALYSIS_DATA_NEEDED, formatValues(required));

        if (!hasDataTransformation(plan)) {
            if (required.equals(Set.of(AnalysisDataForm.SYNTHETIC_DATA))) {
                check.setPlanEvidence("No synthetic data produced");
                check.setStatus(RequirementCheckResult.FAIL);
            } else {
                check.setPlanEvidence("No data transformation; representation unchanged");
                check.setStatus(RequirementCheckResult.PASS);
            }
            return Optional.of(check);
        }

        Optional<MitigationResultingDataForm> form = resultingDataForm(plan);
        if (form.isEmpty()) {
            check.setPlanEvidence("Resulting data form not configured");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("Data-transformation actions require explicit resulting-data-form metadata.");
            return Optional.of(check);
        }

        MitigationResultingDataForm resulting = form.get();
        if (required.contains(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA)) {
            if (resulting == MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL) {
                check.setPlanEvidence("Individual-level structure retained");
                check.setStatus(RequirementCheckResult.PASS);
            } else {
                check.setPlanEvidence(resulting == MitigationResultingDataForm.AGGREGATED
                        ? "Aggregate-only representation"
                        : "Synthetic representation");
                check.setStatus(RequirementCheckResult.FAIL);
                check.setNote("The Activity explicitly requires individual-level data for analysis.");
            }
        } else if (required.contains(AnalysisDataForm.SYNTHETIC_DATA)) {
            boolean synthetic = resulting == MitigationResultingDataForm.SYNTHETIC;
            check.setPlanEvidence(synthetic ? "Synthetic representation produced" : "Synthetic representation not produced");
            check.setStatus(synthetic ? RequirementCheckResult.PASS : RequirementCheckResult.FAIL);
        } else {
            // Only aggregate data is needed.
            check.setPlanEvidence(resulting == MitigationResultingDataForm.AGGREGATED
                    ? "Aggregate representation produced"
                    : "Representation can support aggregate analysis");
            check.setStatus(RequirementCheckResult.PASS);
        }
        return Optional.of(check);
    }

    private Optional<RequirementCheck> externalDeliverableCheck(
            MitigationPlanDraftEvaluationDTO plan,
            Set<ExternalDeliverable> deliverables
    ) {
        if (deliverables.isEmpty()) {
            return Optional.empty();
        }
        RequirementCheck check = check(ActivityRequirement.REQUIRED_EXTERNAL_DELIVERABLES, formatValues(deliverables));
        if (!deliverables.contains(ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET)) {
            check.setPlanEvidence("Compatible; no downloadable record-level data required");
            check.setStatus(RequirementCheckResult.PASS);
            return Optional.of(check);
        }

        Optional<MitigationResultingDataForm> form = resultingDataForm(plan);
        if (form.isEmpty()) {
            check.setPlanEvidence("Resulting data form not configured");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("The downloadable-dataset requirement cannot be checked without data-form metadata.");
        } else if (form.get() == MitigationResultingDataForm.AGGREGATED) {
            check.setPlanEvidence("Aggregate output only");
            check.setStatus(RequirementCheckResult.FAIL);
            check.setNote("The Activity requires an anonymized downloadable dataset.");
        } else {
            check.setPlanEvidence(hasDataTransformation(plan)
                    ? "Residual risk not evaluated"
                    : "No data transformation; residual risk not evaluated");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("Residual re-identification risk must be measured before the transformed record-level "
                    + "data can be considered an anonymized downloadable dataset.");
        }
        return Optional.of(check);
    }

    private Optional<RequirementCheck> temporalCheck(MitigationPlanDraftEvaluationDTO plan, TemporalResolution required) {
        if (required == null || required == TemporalResolution.NOT_REQUIRED) {
            return Optional.empty();
        }
        RequirementCheck check = check(ActivityRequirement.REQUIRED_TEMPORAL_RESOLUTION, titleCase(required.name()));
        Optional<PlanActionParameter> resolution = parameters(plan, MitigationParameterCode.TARGET_RESOLUTION).findFirst();
        if (resolution.isEmpty()) {
            check.setPlanEvidence("Original precision retained");
            check.setStatus(RequirementCheckResult.PASS);
        } else if (!resolution.get().isResolved()) {
            check.setPlanEvidence("Not selected");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("Select a target resolution to check it against the Activity requirement.");
        } else {
            check.setPlanEvidence(titleCase(resolution.get().getValue()));
            check.setStatus(fromParameterCompatibility(resolution.get().getCompatibility()));
        }
        return Optional.of(check);
    }

    private Optional<RequirementCheck> cohortCheck(MitigationPlanDraftEvaluationDTO plan, BigDecimal minimumRetentionPercent) {
        if (minimumRetentionPercent == null) {
            return Optional.empty();
        }
        RequirementCheck check = check(ActivityRequirement.MINIMUM_COHORT_RETENTION,
                minimumRetentionPercent.stripTrailingZeros().toPlainString() + "%");
        if (!hasDataTransformation(plan)) {
            check.setPlanEvidence("No data transformation; records unchanged");
            check.setStatus(RequirementCheckResult.PASS);
        } else if (dataActions(plan).anyMatch(action -> action.getRecordRetentionEffect() == null)) {
            check.setPlanEvidence("Record-retention effect not configured");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("The Knowledge Base action needs explicit record-retention metadata before this can be checked.");
        } else if (dataActions(plan).anyMatch(action -> action.getRecordRetentionEffect() == MitigationRecordRetentionEffect.MAY_REMOVE_RECORDS)) {
            check.setPlanEvidence("Records may be removed; needs measurement");
            check.setStatus(RequirementCheckResult.NEEDS_EVALUATION);
            check.setNote("Participant retention can only be measured after the transformation has been executed.");
        } else {
            check.setPlanEvidence("Records retained");
            check.setStatus(RequirementCheckResult.PASS);
        }
        return Optional.of(check);
    }

    private RequirementCheckResult fromParameterCompatibility(ParameterValueCompatibility compatibility) {
        if (compatibility == ParameterValueCompatibility.COMPATIBLE) {
            return RequirementCheckResult.PASS;
        }
        return compatibility == ParameterValueCompatibility.INCOMPATIBLE
                ? RequirementCheckResult.FAIL
                : RequirementCheckResult.NEEDS_EVALUATION;
    }

    private boolean hasDataTransformation(MitigationPlanDraftEvaluationDTO plan) {
        return dataActions(plan).findAny().isPresent();
    }

    private Stream<PlanAction> dataActions(MitigationPlanDraftEvaluationDTO plan) {
        return plan.getActions().stream()
                .filter(action -> action.getActionType() == MitigationActionType.DATA_TRANSFORMATION);
    }

    /**
     * The data form the plan's transformations produce together: aggregation dominates synthesis,
     * which dominates record-level output. Empty when any transformation lacks the metadata.
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
        return Optional.of(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL);
    }

    private Stream<PlanActionParameter> parameters(MitigationPlanDraftEvaluationDTO plan, MitigationParameterCode code) {
        return plan.getActions().stream()
                .flatMap(action -> action.getParameters().stream())
                .filter(parameter -> parameter.getParameterCode() == code);
    }

    private RequirementCheck check(ActivityRequirement requirement, String required) {
        RequirementCheck check = new RequirementCheck();
        check.setRequirement(requirement);
        check.setConstraintType(requirement.constraintType());
        check.setRequired(required);
        return check;
    }

    // Declaration order keeps the text stable; persisted sets have no order.
    private String formatValues(Set<? extends Enum<?>> values) {
        return values.stream()
                .sorted(Comparator.comparingInt(Enum::ordinal))
                .map(value -> titleCase(value.name()))
                .collect(Collectors.joining(", "));
    }

    private String rangeText(String currency, BigDecimal min, BigDecimal max) {
        return min.compareTo(max) == 0 ? money(currency, min) : money(currency, min) + "-" + max.stripTrailingZeros().toPlainString();
    }

    private String money(String currency, BigDecimal amount) {
        return (currency == null ? "" : currency + " ") + amount.stripTrailingZeros().toPlainString();
    }

    private String titleCase(String code) {
        String lower = code.toLowerCase(Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
