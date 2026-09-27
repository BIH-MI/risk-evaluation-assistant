package org.bihealth.mi.risk_assessment_api.service;

import java.math.BigDecimal;

/**
 * Numeric bound-checking shared by {@link ProjectTemplateService} (validating
 * an administrator's configured {@code defaultValue}/{@code fixedValue}) and
 * {@link ProjectService} (validating a submitted
 * {@code ProjectRequirementResponse}) against the same
 * {@code minValue}/{@code maxValue} a Project Template requirement defines.
 */
final class ProjectTemplateRequirementValidation {

    private ProjectTemplateRequirementValidation() {
    }

    static void validateNumber(String field, BigDecimal value, BigDecimal minValue, BigDecimal maxValue, boolean integer) {
        if (integer && value.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException(field + " must be an integer.");
        }
        if (minValue != null && value.compareTo(minValue) < 0) {
            throw new IllegalArgumentException(field + " must be greater than or equal to " + minValue + ".");
        }
        if (maxValue != null && value.compareTo(maxValue) > 0) {
            throw new IllegalArgumentException(field + " must be less than or equal to " + maxValue + ".");
        }
    }
}
