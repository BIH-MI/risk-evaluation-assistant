package org.bihealth.mi.risk_assessment_api.dto.request.activity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.AnalysisDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ExternalDeliverable;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Sharing requirements of a Data Sharing Activity, in activity requests and responses and in the
 * mitigation planner overview. Every requirement is optional.
 */
@Data
@NoArgsConstructor
public class ActivityRequirementsDTO {

    @PositiveOrZero(message = "The maximum setup time must not be negative.")
    private Integer maximumSetupTimeDays;

    @PositiveOrZero(message = "The available budget must not be negative.")
    private BigDecimal availableBudget;

    @Pattern(regexp = "[A-Z]{3}", message = "The budget currency must be a three-letter code such as EUR.")
    private String budgetCurrency;

    private TemporalResolution requiredTemporalResolution;

    @DecimalMin(value = "0", message = "The minimum cohort retention must be between 0 and 100%.")
    @DecimalMax(value = "100", message = "The minimum cohort retention must be between 0 and 100%.")
    private BigDecimal minimumCohortRetentionPercent;

    private Set<AnalysisDataForm> analysisDataNeeded = new LinkedHashSet<>();

    private Set<ExternalDeliverable> requiredExternalDeliverables = new LinkedHashSet<>();

    private MitigationSharingArrangement sharingArrangement;

    // A budget can only be compared with cost estimates in the same currency.
    @JsonIgnore
    @AssertTrue(message = "Enter the currency of the available budget.")
    public boolean isBudgetCurrencyGivenForBudget() {
        return availableBudget == null || budgetCurrency != null;
    }

    // Record-level data never leave a secure analysis environment; only results are exported.
    @JsonIgnore
    @AssertTrue(message = "A secure remote analysis cannot deliver a downloadable dataset.")
    public boolean isDeliverableAllowedForSharingArrangement() {
        return sharingArrangement != MitigationSharingArrangement.SECURE_REMOTE_ANALYSIS
                || requiredExternalDeliverables == null
                || !requiredExternalDeliverables.contains(ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET);
    }

    public static ActivityRequirementsDTO from(ActivityRequirements requirements) {
        ActivityRequirementsDTO dto = new ActivityRequirementsDTO();
        dto.setMaximumSetupTimeDays(requirements.getMaximumSetupTimeDays());
        dto.setAvailableBudget(requirements.getAvailableBudget());
        dto.setBudgetCurrency(requirements.getBudgetCurrency());
        dto.setRequiredTemporalResolution(requirements.getRequiredTemporalResolution());
        dto.setMinimumCohortRetentionPercent(requirements.getMinimumCohortRetentionPercent());
        dto.setAnalysisDataNeeded(inDeclarationOrder(requirements.getAnalysisDataNeeded()));
        dto.setRequiredExternalDeliverables(inDeclarationOrder(requirements.getRequiredExternalDeliverables()));
        dto.setSharingArrangement(requirements.getSharingArrangement());
        return dto;
    }

    /**
     * Copies these values onto a persisted requirements object. Collections are updated in place
     * so Hibernate keeps tracking them. A blank currency becomes null and a deprecated sharing
     * arrangement code is stored as its current equivalent.
     */
    public void applyTo(ActivityRequirements requirements) {
        requirements.setMaximumSetupTimeDays(maximumSetupTimeDays);
        requirements.setAvailableBudget(availableBudget);
        requirements.setBudgetCurrency(blankToNull(budgetCurrency));
        requirements.setRequiredTemporalResolution(requiredTemporalResolution);
        requirements.setMinimumCohortRetentionPercent(minimumCohortRetentionPercent);
        replace(requirements.getAnalysisDataNeeded(), analysisDataNeeded);
        replace(requirements.getRequiredExternalDeliverables(), requiredExternalDeliverables);
        requirements.setSharingArrangement(sharingArrangement == null ? null : sharingArrangement.canonical());
    }

    // Persisted sets have no order; the API lists choices in their declaration order.
    private static <E extends Enum<E>> Set<E> inDeclarationOrder(Set<E> values) {
        return values.stream().sorted().collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static <T> void replace(Set<T> target, Set<T> values) {
        target.clear();
        if (values != null) {
            target.addAll(values);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
