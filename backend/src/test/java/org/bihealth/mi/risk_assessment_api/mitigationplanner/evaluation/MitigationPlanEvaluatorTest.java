package org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStrategy;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.InferenceResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.compatibility.ProjectConstraintCompatibilityService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Scientific invariant: a proposed data transformation never produces a residual q or a changed
 * R_anon. The transformed data do not exist yet, so the plan must require measuring q.
 */
@ExtendWith(MockitoExtension.class)
class MitigationPlanEvaluatorTest {

    @Mock
    private CounterfactualContextEvaluator contextEvaluator;

    @Test
    void dataPlanLeavesResidualRiskUnevaluatedAndKeepsBaselineRAnon() {
        MitigationPlanEvaluator evaluator = new MitigationPlanEvaluator(
                contextEvaluator,
                new MitigationPlanEstimateService(),
                new ProjectConstraintEvaluationService(new ProjectConstraintCompatibilityService()));

        DataOpportunity coarsenDate = new DataOpportunity();
        coarsenDate.setActionId(1L);
        coarsenDate.setActionCode("COARSEN_DATE");
        coarsenDate.setActionName("Coarsen temporal information");
        coarsenDate.setActionType(MitigationActionType.DATA_TRANSFORMATION);
        coarsenDate.setAddressedRiskDriverIds(List.of("D1"));
        coarsenDate.setResultingDataForm(MitigationResultingDataForm.PRESERVES_INDIVIDUAL_LEVEL);
        coarsenDate.setRecordRetentionEffect(MitigationRecordRetentionEffect.PRESERVES_RECORDS);
        coarsenDate.setEstimate(new OperationalEstimate());

        BaselineRisk baseline = new BaselineRisk();
        baseline.setAnonymizationThreshold(0.05);
        InferenceResult inference = new InferenceResult(List.of(), List.of(), List.of(coarsenDate), List.of(), List.of());
        MitigationPlanningContext context = new MitigationPlanningContext(null, null, inference, List.of(), baseline);

        MitigationPlanDraftEvaluationDTO plan = evaluator.evaluate(context, new CandidatePlan(List.of(1L), List.of()));

        assertThat(plan.getStrategy()).isEqualTo(MitigationPlanStrategy.DATA);
        assertThat(plan.isDataRiskEvaluationRequired()).isTrue();
        assertThat(plan.getBaselineRequiredDataRiskThreshold()).isEqualTo(0.05);
        assertThat(plan.getRequiredDataRiskThreshold()).isEqualTo(0.05);
        assertThat(plan.getRemainingEvaluationItems())
                .anyMatch(item -> item.contains("Measure residual re-identification risk q"));
        assertThat(plan.getStatus()).isEqualTo(MitigationPlanStatus.EVALUATION_REQUIRED);
        verify(contextEvaluator, never()).evaluate(any(), any(), any());
    }
}
