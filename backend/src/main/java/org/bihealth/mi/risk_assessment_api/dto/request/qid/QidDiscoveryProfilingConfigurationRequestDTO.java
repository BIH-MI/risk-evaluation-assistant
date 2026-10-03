package org.bihealth.mi.risk_assessment_api.dto.request.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Exhaustive attribute-subset profiling settings for QID discovery evidence.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoveryProfilingConfigurationRequestDTO {
    private Integer maxSubsetSize;
    private Integer maxEvaluatedSubsets;
}
