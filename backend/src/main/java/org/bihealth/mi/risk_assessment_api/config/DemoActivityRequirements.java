package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.enums.AnalysisDataForm;
import org.bihealth.mi.risk_assessment_api.enums.ExternalDeliverable;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;

import java.math.BigDecimal;
import java.util.List;

/**
 * Sharing purposes and requirements of the seeded demo Data Sharing Activities, one scenario per
 * sharing arrangement, so the Mitigation Planner checks the demo activities against realistic
 * requirements right away. The values are those of the former demo studies; they are illustrative,
 * not recommendations.
 *
 * <p>Every call returns a new requirements object: Hibernate does not allow two activities to
 * share one collection instance.</p>
 */
final class DemoActivityRequirements {

    static final String CONTROLLED_TRANSFER_PURPOSE =
            "Evaluate demographic and clinical predictors of disease severity.";
    static final String PUBLIC_RELEASE_PURPOSE =
            "Provide a reusable public research data product while retaining enough information for "
                    + "descriptive epidemiological analyses.";
    static final String SECURE_ANALYSIS_PURPOSE =
            "Preserve detailed clinical information for statistical analysis while avoiding unrestricted "
                    + "distribution of individual-level records.";

    private DemoActivityRequirements() {
    }

    /** An approved recipient receives an anonymized dataset for analysis outside the custodian's environment. */
    static ActivityRequirements controlledTransfer() {
        ActivityRequirements requirements = new ActivityRequirements();
        requirements.setSharingArrangement(MitigationSharingArrangement.CONTROLLED_DATA_TRANSFER);
        requirements.getAnalysisDataNeeded().add(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA);
        requirements.getRequiredExternalDeliverables().addAll(List.of(
                ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET,
                ExternalDeliverable.AGGREGATE_RESULTS,
                ExternalDeliverable.TABLES_FIGURES));
        requirements.setRequiredTemporalResolution(TemporalResolution.MONTH);
        requirements.setMinimumCohortRetentionPercent(new BigDecimal("95"));
        requirements.setMaximumSetupTimeDays(30);
        requirements.setAvailableBudget(new BigDecimal("5000"));
        requirements.setBudgetCurrency("EUR");
        return requirements;
    }

    /** The anonymized patient-level dataset is made openly downloadable. */
    static ActivityRequirements publicRelease() {
        ActivityRequirements requirements = new ActivityRequirements();
        requirements.setSharingArrangement(MitigationSharingArrangement.PUBLIC_RELEASE);
        requirements.getAnalysisDataNeeded().add(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA);
        requirements.getRequiredExternalDeliverables().addAll(List.of(
                ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET,
                ExternalDeliverable.AGGREGATE_RESULTS));
        requirements.setRequiredTemporalResolution(TemporalResolution.MONTH);
        requirements.setMinimumCohortRetentionPercent(new BigDecimal("90"));
        requirements.setMaximumSetupTimeDays(45);
        return requirements;
    }

    /** Researchers analyse detailed data inside a controlled environment; only aggregates leave it. */
    static ActivityRequirements secureAnalysis() {
        ActivityRequirements requirements = new ActivityRequirements();
        requirements.setSharingArrangement(MitigationSharingArrangement.SECURE_REMOTE_ANALYSIS);
        requirements.getAnalysisDataNeeded().add(AnalysisDataForm.INDIVIDUAL_LEVEL_DATA);
        requirements.getRequiredExternalDeliverables().addAll(List.of(
                ExternalDeliverable.AGGREGATE_RESULTS,
                ExternalDeliverable.TABLES_FIGURES));
        requirements.setRequiredTemporalResolution(TemporalResolution.MONTH);
        requirements.setMinimumCohortRetentionPercent(new BigDecimal("98"));
        requirements.setAvailableBudget(new BigDecimal("3000"));
        requirements.setBudgetCurrency("EUR");
        return requirements;
    }
}
