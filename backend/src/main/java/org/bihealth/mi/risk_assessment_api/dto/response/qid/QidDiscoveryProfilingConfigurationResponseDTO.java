package org.bihealth.mi.risk_assessment_api.dto.response.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;

/**
 * Client-facing profiling object passed into browser-side QID profiling.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoveryProfilingConfigurationResponseDTO {
    private Integer maxSubsetSize;
    private Integer maxEvaluatedSubsets;

    public QidDiscoveryProfilingConfigurationResponseDTO(QidDiscoveryConfigurationVersion version) {
        this.maxSubsetSize = version.getMaxSubsetSize();
        this.maxEvaluatedSubsets = version.getMaxEvaluatedSubsets();
    }
}
