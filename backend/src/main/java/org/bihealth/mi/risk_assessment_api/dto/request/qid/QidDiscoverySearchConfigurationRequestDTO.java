package org.bihealth.mi.risk_assessment_api.dto.request.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Search, ranking, pruning, strategy, and retention settings for QID discovery.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoverySearchConfigurationRequestDTO {
    private String searchType;
    private Integer exactSearchMaxCandidateCount;
    private Integer maxCombinationSize;
    private Integer beamWidth;
    private Double minImprovement;
    private Integer stagnationDepthLimit;
    private Double targetDistinction;
    private Double targetSeparation;
    private Double distinctionWeight;
    private Double separationWeight;
    private Double attributeCountPenalty;
    private Integer maxPersistedCombinations;
}
