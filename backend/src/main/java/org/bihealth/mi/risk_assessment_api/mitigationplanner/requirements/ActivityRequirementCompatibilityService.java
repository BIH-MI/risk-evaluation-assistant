package org.bihealth.mi.risk_assessment_api.mitigationplanner.requirements;

import java.math.BigDecimal;
import java.util.Locale;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanFeasibility;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.enums.ActivityRequirement;
import org.bihealth.mi.risk_assessment_api.enums.DateResolution;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.RequirementCheckResult;
import org.bihealth.mi.risk_assessment_api.enums.RequirementConstraintType;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.springframework.stereotype.Service;

/**
 * Deterministic comparisons between Knowledge Base action metadata and the requirements of a
 * Data Sharing Activity.
 *
 * <p>Only explicit relationships are checked, and one incompatible parameter value never makes
 * the whole action infeasible.</p>
 */
@Service
public class ActivityRequirementCompatibilityService {

    /** Adds compatibility annotations for the activity's requirements to a parameter, in place. */
    public void annotate(PlanParameter parameter, ActivityRequirements requirements) {
        BigDecimal minimumCohortRetention = requirements.getMinimumCohortRetentionPercent();
        if (parameter.getParameterCode() == MitigationParameterCode.TARGET_RESOLUTION) {
            annotateTargetResolution(parameter, requirements.getRequiredTemporalResolution());
        } else if (parameter.getParameterCode() == MitigationParameterCode.SUPPRESSION_LIMIT
                && minimumCohortRetention != null) {
            // Record suppression and participant retention are not equivalent, so a limit
            // must not be judged against the retention target without a concrete evaluation.
            parameter.setCompatibility(ParameterValueCompatibility.EVALUATION_REQUIRED);
            parameter.setCompatibilityReason("Activity requires minimum cohort retention of "
                    + minimumCohortRetention.stripTrailingZeros().toPlainString()
                    + "%. Compatibility can only be determined after evaluating a concrete transformation.");
        }
    }

    /**
     * Conservative comparison of an estimated range with an upper limit: PASS only when the whole
     * range fits, FAIL only when even the lower bound exceeds the limit, otherwise
     * NEEDS_EVALUATION. A missing bound is treated as unknown, never as zero.
     */
    public RequirementCheckResult compareRangeWithLimit(BigDecimal min, BigDecimal max, BigDecimal limit) {
        if (min == null || max == null || limit == null) {
            return RequirementCheckResult.NEEDS_EVALUATION;
        }
        if (max.compareTo(limit) <= 0) {
            return RequirementCheckResult.PASS;
        }
        return min.compareTo(limit) > 0 ? RequirementCheckResult.FAIL : RequirementCheckResult.NEEDS_EVALUATION;
    }

    /**
     * Compares one action's operational estimate with the activity's budget and setup-time limits.
     *
     * @return null when the activity defines neither limit
     */
    public PlanFeasibility assessOperationalFeasibility(OperationalEstimate estimate, ActivityRequirements requirements) {
        BigDecimal budget = requirements.getAvailableBudget();
        Integer maximumSetupDays = requirements.getMaximumSetupTimeDays();
        if (budget == null && maximumSetupDays == null) {
            return null;
        }
        PlanFeasibility feasibility = new PlanFeasibility();
        RequirementCheckResult result = RequirementCheckResult.PASS;
        if (budget != null) {
            RequirementCheckResult budgetResult = budgetResult(estimate, budget, requirements.getBudgetCurrency());
            feasibility.getReasons().add("Budget: " + label(budgetResult));
            result = worst(result, planLevelResult(budgetResult, ActivityRequirement.AVAILABLE_BUDGET));
        }
        if (maximumSetupDays != null) {
            RequirementCheckResult setupResult = compareRangeWithLimit(
                    days(estimate == null ? null : lowerBound(estimate.getSetupDaysMin(), estimate.getSetupDaysMax())),
                    days(estimate == null ? null : upperBound(estimate.getSetupDaysMin(), estimate.getSetupDaysMax())),
                    BigDecimal.valueOf(maximumSetupDays));
            feasibility.getReasons().add("Setup time: " + label(setupResult));
            result = worst(result, planLevelResult(setupResult, ActivityRequirement.MAXIMUM_SETUP_TIME));
        }
        feasibility.setResult(result);
        return feasibility;
    }

    /**
     * Contribution of one check to a plan-level or action-level result: only a hard constraint can
     * make it FAIL; an unmet preference needs a trade-off decision.
     */
    public RequirementCheckResult planLevelResult(RequirementCheckResult checkResult, ActivityRequirement requirement) {
        if (checkResult == RequirementCheckResult.FAIL
                && requirement.constraintType() != RequirementConstraintType.HARD_CONSTRAINT) {
            return RequirementCheckResult.NEEDS_EVALUATION;
        }
        return checkResult;
    }

    public RequirementCheckResult worst(RequirementCheckResult left, RequirementCheckResult right) {
        return left.ordinal() >= right.ordinal() ? left : right;
    }

    private RequirementCheckResult budgetResult(OperationalEstimate estimate, BigDecimal budget, String budgetCurrency) {
        if (estimate == null || (estimate.getCostMin() == null && estimate.getCostMax() == null)) {
            return RequirementCheckResult.NEEDS_EVALUATION;
        }
        // Amounts in different currencies are never compared.
        if (budgetCurrency == null || estimate.getCurrency() == null
                || !budgetCurrency.equalsIgnoreCase(estimate.getCurrency())) {
            return RequirementCheckResult.NEEDS_EVALUATION;
        }
        return compareRangeWithLimit(
                lowerBound(estimate.getCostMin(), estimate.getCostMax()),
                upperBound(estimate.getCostMin(), estimate.getCostMax()),
                budget);
    }

    private void annotateTargetResolution(PlanParameter parameter, TemporalResolution requiredResolution) {
        DateResolution required = requiredResolution == null ? null : requiredResolution.coarsestAcceptable();
        if (required == null) {
            return; // No explicit requirement (or NOT_REQUIRED): nothing to compare against.
        }

        String reason = "Activity requires temporal resolution of at least " + resolutionLabel(required) + ".";
        for (ParameterValue value : parameter.getAllowedValues()) {
            DateResolution candidate = parseResolution(value.getValue());
            if (candidate == null) {
                continue;
            }
            // DateResolution is ordered from finest to coarsest.
            value.setCompatibility(candidate.ordinal() <= required.ordinal()
                    ? ParameterValueCompatibility.COMPATIBLE
                    : ParameterValueCompatibility.INCOMPATIBLE);
            value.setCompatibilityReason(reason);
        }
    }

    // Parameter values are Knowledge Base text; an unknown value is left unannotated.
    private DateResolution parseResolution(String value) {
        if (value == null) {
            return null;
        }
        try {
            return DateResolution.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String resolutionLabel(DateResolution resolution) {
        String lower = resolution.name().toLowerCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private String label(RequirementCheckResult result) {
        return switch (result) {
            case PASS -> "Pass";
            case NEEDS_EVALUATION -> "Needs evaluation";
            case FAIL -> "Fail";
        };
    }

    // A single configured bound describes both ends of the range.
    private static <T> T lowerBound(T min, T max) {
        return min != null ? min : max;
    }

    private static <T> T upperBound(T min, T max) {
        return max != null ? max : min;
    }

    private BigDecimal days(Integer days) {
        return days == null ? null : BigDecimal.valueOf(days);
    }
}
