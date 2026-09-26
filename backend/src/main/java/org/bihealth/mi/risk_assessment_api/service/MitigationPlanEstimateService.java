package org.bihealth.mi.risk_assessment_api.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.CostEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.SetupEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.springframework.stereotype.Service;

/**
 * Aggregates operational estimates for draft plans without inventing missing effort.
 */
@Service
public class MitigationPlanEstimateService {

    public void applyEstimates(List<Opportunity> selected, MitigationPlanDraftEvaluationDTO plan) {
        aggregateCost(selected, plan);
        aggregateSetup(selected, plan);
    }

    private void aggregateCost(List<Opportunity> selected, MitigationPlanDraftEvaluationDTO plan) {
        CostEstimate cost = plan.getCostEstimate();
        List<OperationalEstimate> estimates = selected.stream().map(Opportunity::getEstimate).collect(Collectors.toList());
        if (estimates.stream().noneMatch(e -> e.getCostMin() != null || e.getCostMax() != null)) {
            cost.setAvailability(EstimateAvailability.UNKNOWN);
            return;
        }
        boolean complete = estimates.stream()
                .allMatch(e -> (e.getCostMin() != null || e.getCostMax() != null) && e.getCurrency() != null);
        if (!complete) {
            cost.setAvailability(EstimateAvailability.PARTIAL);
            cost.setNote("Only some selected actions have a cost estimate; missing estimates are not treated as zero.");
            return;
        }
        boolean sameCurrency = estimates.stream()
                .map(e -> e.getCurrency().toUpperCase(Locale.ROOT))
                .distinct()
                .count() == 1;
        boolean sameScope = estimates.size() == 1
                || (estimates.stream().allMatch(e -> e.getEstimateScope() != null)
                && estimates.stream().map(OperationalEstimate::getEstimateScope).distinct().count() == 1);
        if (!sameCurrency || !sameScope) {
            cost.setAvailability(EstimateAvailability.PARTIAL);
            cost.setNote("Estimates differ in currency or scope and are not aggregated.");
            return;
        }
        BigDecimal min = BigDecimal.ZERO;
        BigDecimal max = BigDecimal.ZERO;
        for (OperationalEstimate estimate : estimates) {
            min = min.add(estimate.getCostMin() != null ? estimate.getCostMin() : estimate.getCostMax());
            max = max.add(estimate.getCostMax() != null ? estimate.getCostMax() : estimate.getCostMin());
        }
        cost.setAvailability(EstimateAvailability.KNOWN);
        cost.setMin(min);
        cost.setMax(max);
        cost.setCurrency(estimates.get(0).getCurrency().toUpperCase(Locale.ROOT));
    }

    private void aggregateSetup(List<Opportunity> selected, MitigationPlanDraftEvaluationDTO plan) {
        SetupEstimate setup = plan.getSetupEstimate();
        List<OperationalEstimate> estimates = selected.stream().map(Opportunity::getEstimate).collect(Collectors.toList());
        if (estimates.stream().noneMatch(e -> e.getSetupDaysMin() != null || e.getSetupDaysMax() != null)) {
            setup.setAvailability(EstimateAvailability.UNKNOWN);
            return;
        }
        boolean complete = estimates.stream().allMatch(e -> e.getSetupDaysMin() != null || e.getSetupDaysMax() != null);
        if (!complete) {
            setup.setAvailability(EstimateAvailability.PARTIAL);
            setup.setNote("Only some selected actions have a setup-time estimate; missing estimates are not treated as zero.");
            return;
        }
        int min = 0;
        int max = 0;
        for (OperationalEstimate estimate : estimates) {
            min += estimate.getSetupDaysMin() != null ? estimate.getSetupDaysMin() : estimate.getSetupDaysMax();
            max += estimate.getSetupDaysMax() != null ? estimate.getSetupDaysMax() : estimate.getSetupDaysMin();
        }
        setup.setAvailability(EstimateAvailability.KNOWN);
        setup.setMinDays(min);
        setup.setMaxDays(max);
    }
}
