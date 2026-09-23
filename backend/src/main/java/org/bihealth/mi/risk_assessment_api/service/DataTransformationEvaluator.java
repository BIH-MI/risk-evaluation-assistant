package org.bihealth.mi.risk_assessment_api.service;

import java.util.List;
import java.util.Map;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.PlanAction;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;

/**
 * Boundary for a future engine (for example ARX) that executes proposed data transformations and
 * measures the result.
 *
 * <p>REA does not ship an implementation yet. While no bean implements this interface, every plan
 * reports its residual data risk q as NOT_EVALUATED. The Mitigation Planner itself never
 * estimates q, record retention or utility from catalogue metadata.</p>
 */
public interface DataTransformationEvaluator {

    /**
     * Executes the selected data transformations on a working copy of the activity's data and
     * measures the transformed release. Persisted datasets and assessments must not be modified.
     */
    Result evaluate(DataSharingActivity activity, List<PlanAction> dataActions);

    /**
     * @param residualDataRisk measured residual re-identification risk q of the transformed data
     * @param recordRetentionPercent share of records retained after transformation
     * @param utilityMetrics named utility measurements of the transformed data
     * @param transformationDetails human-readable description of what was executed
     */
    record Result(
            double residualDataRisk,
            Double recordRetentionPercent,
            Map<String, Double> utilityMetrics,
            List<String> transformationDetails
    ) {}
}
