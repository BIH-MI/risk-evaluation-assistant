package org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner;

import java.util.ArrayList;
import java.util.List;

import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A researcher-constructed combination of catalogue actions to evaluate. Drafts are not persisted.
 */
@Data
@NoArgsConstructor
public class MitigationPlanDraftRequestDTO {
    private List<Long> selectedActionIds = new ArrayList<>();
    private List<SelectedParameter> selectedParameters = new ArrayList<>();

    // Effective target threshold T (fraction) from the report; null means configured.
    private Double manualRiskThreshold;

    @Data
    @NoArgsConstructor
    public static class SelectedParameter {
        private Long actionId;
        private MitigationParameterCode parameterCode;
        private String value;
    }
}
