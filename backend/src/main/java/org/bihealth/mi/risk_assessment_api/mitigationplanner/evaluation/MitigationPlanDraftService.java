package org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner.MitigationPlanDraftRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.MitigationPlanningContextFactory;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan.ParameterSelection;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Thin wrapper for the manual (researcher-assembled) draft-plan API.
 *
 * <p>Manual plans go through the same {@link MitigationPlanEvaluator} as
 * automatically generated candidates; only the action selection differs.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlanDraftService {

    private final MitigationPlanningContextFactory planningContextFactory;
    private final MitigationPlanEvaluator evaluator;

    public MitigationPlanDraftEvaluationDTO evaluate(
            Long activityId,
            MitigationPlanDraftRequestDTO request,
            String username,
            boolean isAdmin
    ) {
        List<ParameterSelection> parameters = request.getSelectedParameters() == null
                ? List.of()
                : request.getSelectedParameters().stream()
                .map(selection -> new ParameterSelection(
                        selection.getActionId(), selection.getParameterCode(), selection.getValue()))
                .toList();
        CandidatePlan manualPlan = new CandidatePlan(request.getSelectedActionIds(), parameters);
        return evaluator.evaluate(
                planningContextFactory.create(activityId, username, isAdmin, request.getManualRiskThreshold()),
                manualPlan);
    }
}
