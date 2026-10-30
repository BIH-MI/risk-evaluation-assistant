package org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bihealth.mi.risk_assessment_api.dto.request.risk.RiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.RiskThresholdSource;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.service.RiskService;
import org.bihealth.mi.risk_assessment_api.utils.RiskResultBands;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Reads the authoritative REA risk result of an activity as the planner's baseline. It never
 * calculates a mitigation-specific score.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PlanningBaselineRiskLoader {

    private final RiskService riskService;
    private final PlatformTransactionManager transactionManager;

    /**
     * @param manualRiskThreshold target threshold the user set on the report, or null for the configured one
     * @return the baseline, or null (with a warning) when the risk result is unavailable
     */
    public BaselineRisk load(DataSharingActivity activity, Double manualRiskThreshold, List<String> warnings) {
        if (activity.getDatasetAssessment() == null || activity.getRecipientAssessment() == null) {
            warnings.add("Current risk result is unavailable.");
            return null;
        }
        GenericRiskResponseDTO result = calculateRisk(activity, manualRiskThreshold);
        if (result == null) {
            warnings.add("Current risk result is unavailable.");
            return null;
        }

        BaselineRisk risk = new BaselineRisk();
        risk.setImpactBand(RiskResultBands.categoryBand(result, "IMPACT"));
        risk.setControlsBand(RiskResultBands.categoryBand(result, "CONTROLS"));
        risk.setLikelihoodBand(RiskResultBands.categoryBand(result, "LIKELIHOOD"));
        risk.setEffectiveThreshold(result.getThreshold());
        risk.setManualThreshold(manualRiskThreshold);
        risk.setThresholdSource(manualRiskThreshold == null ? RiskThresholdSource.CONFIGURED : RiskThresholdSource.MANUAL);
        risk.setConfiguredThreshold(manualRiskThreshold == null ? result.getThreshold() : configuredThreshold(activity));
        risk.setAttackProbability(result.getContextRisk() == null ? null : result.getContextRisk().getNumericValue());
        risk.setAnonymizationThreshold(result.getFinalRisk() == null ? null : result.getFinalRisk().getNumericValue());
        return risk;
    }

    private Double configuredThreshold(DataSharingActivity activity) {
        GenericRiskResponseDTO configured = calculateRisk(activity, null);
        return configured == null ? null : configured.getThreshold();
    }

    /**
     * Runs the REA risk calculation in its own read-only transaction, so a failure (for example an
     * incomplete assessment) cannot mark the planner's transaction as rollback-only.
     */
    private GenericRiskResponseDTO calculateRisk(DataSharingActivity activity, Double manualRiskThreshold) {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transaction.setReadOnly(true);
        try {
            return transaction.execute(status ->
                    riskService.calculateRisk(new RiskRequestDTO(activity.getId(), manualRiskThreshold)));
        } catch (RuntimeException ex) {
            log.warn("Risk result unavailable for activity {}", activity.getId(), ex);
            return null;
        }
    }
}
