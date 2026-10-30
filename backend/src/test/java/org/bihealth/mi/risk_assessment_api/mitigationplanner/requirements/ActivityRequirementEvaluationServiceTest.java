package org.bihealth.mi.risk_assessment_api.mitigationplanner.requirements;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanActionParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.RequirementCheck;
import org.bihealth.mi.risk_assessment_api.enums.ActivityRequirement;
import org.bihealth.mi.risk_assessment_api.enums.AnalysisDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ExternalDeliverable;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.RequirementCheckResult;
import org.bihealth.mi.risk_assessment_api.enums.RequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.junit.jupiter.api.Test;

/**
 * The checks of a draft plan against typed activity requirements. Only a failed hard constraint
 * fails the plan; unknown information is never a pass.
 */
class ActivityRequirementEvaluationServiceTest {

    private final ActivityRequirementEvaluationService service =
            new ActivityRequirementEvaluationService(new ActivityRequirementCompatibilityService());
    private final ActivityRequirements requirements = new ActivityRequirements();

    @Test
    void unstatedRequirementsAreNotChecked() {
        ActivityRequirementEvaluationService.Evaluation evaluation = service.evaluate(contextPlan(), requirements);

        assertThat(evaluation.checks()).isEmpty();
        assertThat(evaluation.result()).isEqualTo(RequirementCheckResult.PASS);
        assertThat(evaluation.dataRiskEvaluationRequired()).isFalse();
    }

    @Test
    void knownCostWithinTheBudgetPasses() {
        requirements.setAvailableBudget(new BigDecimal("5000.0000"));
        requirements.setBudgetCurrency("EUR");
        MitigationPlanDraftEvaluationDTO plan = contextPlan();
        knownCost(plan, "1000", "2000", "EUR");

        RequirementCheck check = onlyCheck(service.evaluate(plan, requirements));

        assertThat(check.getRequirement()).isEqualTo(ActivityRequirement.AVAILABLE_BUDGET);
        assertThat(check.getConstraintType()).isEqualTo(RequirementConstraintType.HARD_CONSTRAINT);
        assertThat(check.getRequired()).isEqualTo("EUR 5000");
        assertThat(check.getStatus()).isEqualTo(RequirementCheckResult.PASS);
    }

    @Test
    void costAboveTheBudgetFailsThePlan() {
        requirements.setAvailableBudget(new BigDecimal("5000"));
        requirements.setBudgetCurrency("EUR");
        MitigationPlanDraftEvaluationDTO plan = contextPlan();
        knownCost(plan, "6000", "8000", "EUR");

        ActivityRequirementEvaluationService.Evaluation evaluation = service.evaluate(plan, requirements);

        assertThat(onlyCheck(evaluation).getStatus()).isEqualTo(RequirementCheckResult.FAIL);
        assertThat(evaluation.result()).isEqualTo(RequirementCheckResult.FAIL);
    }

    @Test
    void costInAnotherCurrencyIsNeverCompared() {
        requirements.setAvailableBudget(new BigDecimal("5000"));
        requirements.setBudgetCurrency("EUR");
        MitigationPlanDraftEvaluationDTO plan = contextPlan();
        knownCost(plan, "100", "200", "CHF");

        assertThat(onlyCheck(service.evaluate(plan, requirements)).getStatus())
                .isEqualTo(RequirementCheckResult.NEEDS_EVALUATION);
    }

    @Test
    void anUnmetPreferenceFailsItsCheckButOnlyNeedsEvaluationForThePlan() {
        requirements.setRequiredTemporalResolution(TemporalResolution.MONTH);
        MitigationPlanDraftEvaluationDTO plan = dataPlan(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL);
        PlanActionParameter resolution = new PlanActionParameter();
        resolution.setParameterCode(MitigationParameterCode.TARGET_RESOLUTION);
        resolution.setValue("YEAR");
        resolution.setResolved(true);
        resolution.setCompatibility(ParameterValueCompatibility.INCOMPATIBLE);
        plan.getActions().get(0).getParameters().add(resolution);

        ActivityRequirementEvaluationService.Evaluation evaluation = service.evaluate(plan, requirements);

        RequirementCheck check = onlyCheck(evaluation);
        assertThat(check.getRequirement()).isEqualTo(ActivityRequirement.REQUIRED_TEMPORAL_RESOLUTION);
        assertThat(check.getConstraintType()).isEqualTo(RequirementConstraintType.PREFERENCE);
        assertThat(check.getStatus()).isEqualTo(RequirementCheckResult.FAIL);
        assertThat(evaluation.result()).isEqualTo(RequirementCheckResult.NEEDS_EVALUATION);
    }

    @Test
    void temporalResolutionMarkedNotRequiredIsNotChecked() {
        requirements.setRequiredTemporalResolution(TemporalResolution.NOT_REQUIRED);

        assertThat(service.evaluate(dataPlan(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL), requirements).checks())
                .isEmpty();
    }

    @Test
    void cohortRetentionNeedsMeasurementWhenRecordsMayBeRemoved() {
        requirements.setMinimumCohortRetentionPercent(new BigDecimal("95.0000"));
        MitigationPlanDraftEvaluationDTO plan = dataPlan(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL);
        plan.getActions().get(0).setRecordRetentionEffect(MitigationRecordRetentionEffect.MAY_REMOVE_RECORDS);

        RequirementCheck check = onlyCheck(service.evaluate(plan, requirements));

        assertThat(check.getRequired()).isEqualTo("95%");
        assertThat(check.getStatus()).isEqualTo(RequirementCheckResult.NEEDS_EVALUATION);
    }

    @Test
    void aggregationFailsAnActivityThatNeedsIndividualLevelData() {
        requirements.getAnalysisDataNeeded().add(AnalysisDataForm.AGGREGATE_DATA);
        requirements.getAnalysisDataNeeded().add(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA);

        ActivityRequirementEvaluationService.Evaluation evaluation =
                service.evaluate(dataPlan(MitigationResultingDataForm.AGGREGATED), requirements);

        RequirementCheck check = onlyCheck(evaluation);
        assertThat(check.getRequired()).isEqualTo("Individual level data, Aggregate data");
        assertThat(check.getStatus()).isEqualTo(RequirementCheckResult.FAIL);
        assertThat(evaluation.result()).isEqualTo(RequirementCheckResult.FAIL);
    }

    @Test
    void aDownloadableDatasetAlwaysRequiresMeasuringResidualRisk() {
        requirements.getRequiredExternalDeliverables().add(ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET);

        ActivityRequirementEvaluationService.Evaluation evaluation = service.evaluate(contextPlan(), requirements);

        assertThat(onlyCheck(evaluation).getStatus()).isEqualTo(RequirementCheckResult.NEEDS_EVALUATION);
        assertThat(evaluation.dataRiskEvaluationRequired()).isTrue();
    }

    private RequirementCheck onlyCheck(ActivityRequirementEvaluationService.Evaluation evaluation) {
        assertThat(evaluation.checks()).hasSize(1);
        return evaluation.checks().get(0);
    }

    private MitigationPlanDraftEvaluationDTO contextPlan() {
        MitigationPlanDraftEvaluationDTO plan = new MitigationPlanDraftEvaluationDTO();
        PlanAction action = new PlanAction();
        action.setActionType(MitigationActionType.CONTEXT_CONTROL);
        plan.getActions().add(action);
        return plan;
    }

    private MitigationPlanDraftEvaluationDTO dataPlan(MitigationResultingDataForm resultingForm) {
        MitigationPlanDraftEvaluationDTO plan = new MitigationPlanDraftEvaluationDTO();
        PlanAction action = new PlanAction();
        action.setActionType(MitigationActionType.DATA_TRANSFORMATION);
        action.setResultingDataForm(resultingForm);
        action.setRecordRetentionEffect(MitigationRecordRetentionEffect.PRESERVES_RECORDS);
        plan.getActions().add(action);
        return plan;
    }

    private void knownCost(MitigationPlanDraftEvaluationDTO plan, String min, String max, String currency) {
        plan.getCostEstimate().setAvailability(EstimateAvailability.KNOWN);
        plan.getCostEstimate().setMin(new BigDecimal(min));
        plan.getCostEstimate().setMax(new BigDecimal(max));
        plan.getCostEstimate().setCurrency(currency);
    }
}
