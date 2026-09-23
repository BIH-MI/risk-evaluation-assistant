package org.bihealth.mi.risk_assessment_api.dto.request.mitigationplanner;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Selection of context-control actions to evaluate hypothetically.
 */
@Data
@NoArgsConstructor
public class ContextWhatIfRequestDTO {
    private List<Long> actionIds = new ArrayList<>();

    // Effective target threshold T (fraction) the user set on the report; null means configured.
    private Double manualRiskThreshold;
}
