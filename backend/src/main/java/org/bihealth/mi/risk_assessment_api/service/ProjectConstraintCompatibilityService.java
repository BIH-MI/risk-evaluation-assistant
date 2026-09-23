package org.bihealth.mi.risk_assessment_api.service;

import java.math.BigDecimal;
import java.util.Locale;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectFeasibility;
import org.bihealth.mi.risk_assessment_api.enums.DateResolution;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.ParameterValueCompatibility;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.springframework.stereotype.Service;

/**
 * Deterministic comparisons between catalogue metadata and explicit Project constraints.
 *
 * <p>Only explicit relationships are checked. Qualitative requirements such as the critical
 * utility requirement are deliberately not interpreted here, and one incompatible parameter value
 * never makes the whole action infeasible.</p>
 */
@Service
public class ProjectConstraintCompatibilityService {

    /**
     * Adds compatibility annotations to a parameter in place.
     *
     * @param requiredTemporalResolution Project requirement key value, or null when not defined
     * @param minimumCohortRetentionPercent Project requirement value, or null when not defined
     */
    public void annotate(
            PlanParameter parameter,
            String requiredTemporalResolution,
            BigDecimal minimumCohortRetentionPercent
    ) {
        if (parameter.getParameterCode() == MitigationParameterCode.TARGET_RESOLUTION) {
            annotateTargetResolution(parameter, requiredTemporalResolution);
        } else if (parameter.getParameterCode() == MitigationParameterCode.SUPPRESSION_LIMIT
                && minimumCohortRetentionPercent != null) {
            // Record suppression and participant retention are not equivalent, so a limit
            // must not be judged against the retention target without a concrete evaluation.
            parameter.setCompatibility(ParameterValueCompatibility.EVALUATION_REQUIRED);
            parameter.setCompatibilityReason("Project requires minimum cohort retention of "
                    + minimumCohortRetentionPercent.stripTrailingZeros().toPlainString()
                    + "%. Compatibility can only be determined after evaluating a concrete transformation.");
        }
    }

    /**
     * Conservative comparison of an estimated range with an upper Project limit: PASS only when
     * the whole range fits, FAIL only when even the lower bound exceeds the limit, otherwise
     * NEEDS_EVALUATION. A missing bound is treated as unknown, never as zero.
     */
    public ProjectConstraintResult compareRangeWithLimit(BigDecimal min, BigDecimal max, BigDecimal limit) {
        if (min == null || max == null || limit == null) {
            return ProjectConstraintResult.NEEDS_EVALUATION;
        }
        if (max.compareTo(limit) <= 0) {
            return ProjectConstraintResult.PASS;
        }
        return min.compareTo(limit) > 0 ? ProjectConstraintResult.FAIL : ProjectConstraintResult.NEEDS_EVALUATION;
    }

    /**
     * Compares one action's operational estimate with the Project budget and setup-time limits.
     *
     * @return null when the Project defines neither constraint
     */
    public ProjectFeasibility assessOperationalFeasibility(
            OperationalEstimate estimate,
            ProjectConstraint budget,
            ProjectConstraint maximumSetupDays
    ) {
        if (budget == null && maximumSetupDays == null) {
            return null;
        }
        ProjectFeasibility feasibility = new ProjectFeasibility();
        ProjectConstraintResult result = ProjectConstraintResult.PASS;
        if (budget != null) {
            ProjectConstraintResult budgetResult = budgetResult(estimate, budget);
            feasibility.getReasons().add("Budget: " + label(budgetResult));
            result = worst(result, budgetResult);
        }
        if (maximumSetupDays != null) {
            ProjectConstraintResult setupResult = compareRangeWithLimit(
                    days(estimate == null ? null : lowerBound(estimate.getSetupDaysMin(), estimate.getSetupDaysMax())),
                    days(estimate == null ? null : upperBound(estimate.getSetupDaysMin(), estimate.getSetupDaysMax())),
                    decimal(maximumSetupDays.getValue()));
            feasibility.getReasons().add("Setup time: " + label(setupResult));
            result = worst(result, setupResult);
        }
        feasibility.setResult(result);
        return feasibility;
    }

    public ProjectConstraintResult worst(ProjectConstraintResult left, ProjectConstraintResult right) {
        return left.ordinal() >= right.ordinal() ? left : right;
    }

    private ProjectConstraintResult budgetResult(OperationalEstimate estimate, ProjectConstraint budget) {
        if (estimate == null || (estimate.getCostMin() == null && estimate.getCostMax() == null)) {
            return ProjectConstraintResult.NEEDS_EVALUATION;
        }
        // Amounts in different currencies are never compared.
        if (budget.getUnit() == null || estimate.getCurrency() == null
                || !budget.getUnit().equalsIgnoreCase(estimate.getCurrency())) {
            return ProjectConstraintResult.NEEDS_EVALUATION;
        }
        return compareRangeWithLimit(
                lowerBound(estimate.getCostMin(), estimate.getCostMax()),
                upperBound(estimate.getCostMin(), estimate.getCostMax()),
                decimal(budget.getValue()));
    }

    private void annotateTargetResolution(PlanParameter parameter, String requiredTemporalResolution) {
        DateResolution required = parseResolution(requiredTemporalResolution);
        if (required == null) {
            return; // No explicit requirement (or NOT_REQUIRED): nothing to compare against.
        }

        String reason = "Project requires temporal resolution of at least " + resolutionLabel(required) + ".";
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

    private String label(ProjectConstraintResult result) {
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

    private BigDecimal decimal(String value) {
        try {
            return value == null ? null : new BigDecimal(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
