package org.bihealth.mi.risk_assessment_api.mitigationplanner.explanation;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO.ActionRationale;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO.DriverLink;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.EstimateAvailability;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.EvaluatedCandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Explains why each action is in a candidate plan by reusing information the
 * inference step already produced: Risk Driver → matched evidence → action.
 *
 * <p>This is not a generic inference trace; it only relinks existing facts.</p>
 */
@Service
public class CandidatePlanExplanationBuilder {

    public List<ActionRationale> explain(MitigationPlanningContext context, CandidatePlan plan) {
        Map<Long, Opportunity> opportunities = new LinkedHashMap<>();
        Stream.concat(
                        context.inference().dataOpportunities().stream(),
                        context.inference().contextOpportunities().stream())
                .forEach(opportunity -> opportunities.put(opportunity.getActionId(), opportunity));
        Map<String, RiskDriverDTO> drivers = new LinkedHashMap<>();
        Stream.concat(
                        context.inference().dataRiskDrivers().stream(),
                        context.inference().contextRiskDrivers().stream())
                .forEach(driver -> drivers.putIfAbsent(driver.getId(), driver));

        List<ActionRationale> rationales = new ArrayList<>();
        for (Long actionId : plan.actionIds()) {
            Opportunity opportunity = opportunities.get(actionId);
            if (opportunity == null) {
                continue;
            }
            ActionRationale rationale = new ActionRationale();
            rationale.setActionId(actionId);
            rationale.setActionCode(opportunity.getActionCode());
            rationale.setActionName(opportunity.getActionName());
            rationale.setActionType(opportunity.getActionType());
            opportunity.getAddressedRiskDriverIds().stream()
                    .map(drivers::get)
                    .filter(Objects::nonNull)
                    .map(this::toLink)
                    .forEach(rationale.getRiskDrivers()::add);
            rationales.add(rationale);
        }
        return rationales;
    }

    /**
     * Plan-level "why this plan" summary. Every line is derived from the evaluation result;
     * coverage is structural (an action is linked to the driver), not proof the risk is removed.
     */
    public List<String> summarize(
            EvaluatedCandidatePlan plan,
            int criticalDriverTotal,
            int highDriverTotal
    ) {
        MitigationPlanDraftEvaluationDTO evaluation = plan.evaluation();
        List<String> lines = new ArrayList<>();
        if (criticalDriverTotal > 0) {
            lines.add("Structurally covers " + plan.criticalDriverCoverage() + " of " + criticalDriverTotal
                    + " actionable Critical Risk Drivers.");
        }
        if (highDriverTotal > 0) {
            lines.add("Structurally covers " + plan.highDriverCoverage() + " of " + highDriverTotal
                    + " actionable High Risk Drivers.");
        }
        long unresolvedCritical = evaluation.getUnresolvedCriticalFindings().size();
        if (unresolvedCritical > 0) {
            lines.add(unresolvedCritical + " Critical finding(s) are not addressed by this plan and remain part of the "
                    + "risk calculation.");
        }
        long failed = evaluation.getProjectChecks().stream()
                .filter(check -> check.getStatus() == ProjectConstraintResult.FAIL).count();
        lines.add(failed == 0
                ? "No known Project requirement fails; " + plan.unresolvedProjectChecks() + " Project check(s) need evaluation."
                : failed + " Project requirement(s) fail.");
        lines.add("Contains " + evaluation.getActions().size() + " mitigation action(s).");
        lines.add("Cost estimate: " + availability(evaluation.getCostEstimate().getAvailability())
                + "; setup-time estimate: " + availability(evaluation.getSetupEstimate().getAvailability()) + ".");
        int remaining = evaluation.getRemainingEvaluationItems().size();
        lines.add(remaining == 0
                ? "No currently known evaluation item remains."
                : remaining + " evaluation item(s) remain open.");
        return lines;
    }

    private String availability(EstimateAvailability availability) {
        if (availability == null) return "unknown";
        return switch (availability) {
            case KNOWN -> "known";
            case PARTIAL -> "partial (missing values are not treated as zero)";
            default -> "unknown";
        };
    }

    private DriverLink toLink(RiskDriverDTO driver) {
        DriverLink link = new DriverLink();
        link.setRiskDriverId(driver.getId());
        link.setPriority(driver.getPriority());
        link.setSource(driver.getSource());
        link.setCategoryLabel(driver.getCategoryLabel());
        link.setEvidence(evidence(driver));
        link.setMatchedRule(matchedRule(driver));
        return link;
    }

    /** The typed rule condition that linked this finding to the action. */
    private String matchedRule(RiskDriverDTO driver) {
        if (driver.getQuestionCode() != null) {
            return "Question rule: " + driver.getQuestionCode() + " = " + driver.getSelectedOptionCode();
        }
        if (driver.getAttributeRole() != null) {
            return "Attribute rule: " + driver.getAttributeRole()
                    + (driver.getDataType() == null ? "" : " + " + driver.getDataType());
        }
        return null;
    }

    private String evidence(RiskDriverDTO driver) {
        if (driver.getQuestionText() != null) {
            return driver.getSelectedOptionText() == null
                    ? driver.getQuestionText()
                    : driver.getQuestionText() + " → " + driver.getSelectedOptionText();
        }
        if (!driver.getAttributeNames().isEmpty()) {
            String attributes = String.join(", ", driver.getAttributeNames());
            return driver.getTableName() == null ? attributes : driver.getTableName() + ": " + attributes;
        }
        return driver.getExplanation();
    }
}
