package org.bihealth.mi.risk_assessment_api.model.activity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.enums.ActivityRequirement;
import org.bihealth.mi.risk_assessment_api.enums.AnalysisDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ExternalDeliverable;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * The sharing requirements of one Data Sharing Activity that the mitigation planner checks
 * candidate plans against. See {@link ActivityRequirement} for how strictly each one is applied.
 *
 * <p>Every requirement is optional. Null, or an empty selection, means the activity does not
 * state the requirement; it never means zero or "not allowed".</p>
 */
@Embeddable
@Getter
@Setter
public class ActivityRequirements {

    @Column(name = "maximum_setup_time_days")
    private Integer maximumSetupTimeDays;

    // Implementation budget, in budgetCurrency.
    @Column(name = "available_budget", precision = 19, scale = 4)
    private BigDecimal availableBudget;

    // ISO 4217 code such as EUR.
    @Column(name = "budget_currency", length = 3)
    private String budgetCurrency;

    @Enumerated(EnumType.STRING)
    @Column(name = "required_temporal_resolution")
    private TemporalResolution requiredTemporalResolution;

    // Minimum share of participants (0-100) that must remain after suppression or exclusion.
    @Column(name = "minimum_cohort_retention_percent", precision = 7, scale = 4)
    private BigDecimal minimumCohortRetentionPercent;

    // Activities are also deleted by database cascade (with their dataset assessment), so the
    // selections must cascade too.
    @ElementCollection
    @CollectionTable(name = "activity_analysis_data_needed", joinColumns = @JoinColumn(name = "activity_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "data_form", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<AnalysisDataForm> analysisDataNeeded = new LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "activity_required_external_deliverables", joinColumns = @JoinColumn(name = "activity_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "deliverable", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Set<ExternalDeliverable> requiredExternalDeliverables = new LinkedHashSet<>();

    // How access to the data is provided; it restricts which mitigation actions apply.
    @Enumerated(EnumType.STRING)
    @Column(name = "sharing_arrangement")
    private MitigationSharingArrangement sharingArrangement;
}
