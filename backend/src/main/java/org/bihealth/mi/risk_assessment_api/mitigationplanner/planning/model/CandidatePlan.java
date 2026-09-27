package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model;

import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;

import java.util.List;

/**
 * A generated structural combination of currently applicable mitigation
 * actions. It is not an approved or proven mitigation plan.
 */
public record CandidatePlan(
        List<Long> actionIds,
        List<ParameterSelection> parameterSelections
) {
    public CandidatePlan {
        actionIds = actionIds == null ? List.of() : List.copyOf(actionIds);
        parameterSelections = parameterSelections == null ? List.of() : List.copyOf(parameterSelections);
    }

    public record ParameterSelection(
            Long actionId,
            MitigationParameterCode parameterCode,
            String value
    ) {
    }
}
