package org.bihealth.mi.risk_assessment_api.mitigationplanner.requirements;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.RequirementCheckResult;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.junit.jupiter.api.Test;

class ActivityRequirementCompatibilityServiceTest {

    private final ActivityRequirementCompatibilityService service = new ActivityRequirementCompatibilityService();
    private final ActivityRequirements requirements = new ActivityRequirements();

    @Test
    void targetResolutionsCoarserThanRequiredAreIncompatible() {
        requirements.setRequiredTemporalResolution(TemporalResolution.MONTH);
        PlanParameter parameter = parameter(MitigationParameterCode.TARGET_RESOLUTION, "DAY", "MONTH", "QUARTER", "YEAR");

        service.annotate(parameter, requirements);

        assertThat(parameter.getAllowedValues()).extracting(ParameterValue::getCompatibility).containsExactly(
                ParameterValueCompatibility.COMPATIBLE,
                ParameterValueCompatibility.COMPATIBLE,
                ParameterValueCompatibility.INCOMPATIBLE,
                ParameterValueCompatibility.INCOMPATIBLE);
    }

    @Test
    void targetResolutionIsNotAnnotatedWhenTemporalPrecisionIsNotRequired() {
        requirements.setRequiredTemporalResolution(TemporalResolution.NOT_REQUIRED);
        PlanParameter parameter = parameter(MitigationParameterCode.TARGET_RESOLUTION, "YEAR");

        service.annotate(parameter, requirements);

        assertThat(parameter.getAllowedValues().get(0).getCompatibility()).isNull();
    }

    @Test
    void suppressionLimitNeedsEvaluationAgainstACohortRetentionTarget() {
        requirements.setMinimumCohortRetentionPercent(new BigDecimal("95.0000"));
        PlanParameter parameter = parameter(MitigationParameterCode.SUPPRESSION_LIMIT, "1%");

        service.annotate(parameter, requirements);

        assertThat(parameter.getCompatibility()).isEqualTo(ParameterValueCompatibility.EVALUATION_REQUIRED);
        assertThat(parameter.getCompatibilityReason()).contains("95%");
    }

    @Test
    void operationalFeasibilityIsOnlyAssessedAgainstStatedLimits() {
        assertThat(service.assessOperationalFeasibility(new OperationalEstimate(), requirements)).isNull();
    }

    @Test
    void anActionWhoseShortestSetupExceedsTheLimitIsInfeasible() {
        requirements.setMaximumSetupTimeDays(30);
        OperationalEstimate estimate = new OperationalEstimate();
        estimate.setSetupDaysMin(45);
        estimate.setSetupDaysMax(60);

        assertThat(service.assessOperationalFeasibility(estimate, requirements).getResult())
                .isEqualTo(RequirementCheckResult.FAIL);
    }

    @Test
    void anUnknownCostNeedsEvaluationAndIsNeverTreatedAsZero() {
        requirements.setAvailableBudget(new BigDecimal("5000"));
        requirements.setBudgetCurrency("EUR");

        assertThat(service.assessOperationalFeasibility(new OperationalEstimate(), requirements).getResult())
                .isEqualTo(RequirementCheckResult.NEEDS_EVALUATION);
    }

    private PlanParameter parameter(MitigationParameterCode code, String... values) {
        PlanParameter parameter = new PlanParameter();
        parameter.setParameterCode(code);
        parameter.setAllowedValues(List.of(values).stream().map(value -> {
            ParameterValue parameterValue = new ParameterValue();
            parameterValue.setValue(value);
            return parameterValue;
        }).toList());
        return parameter;
    }
}
