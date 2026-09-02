package org.bihealth.mi.risk_assessment_api.dto.response.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;

/**
 * Client-facing search object passed into browser-side QID profiling.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoverySearchConfigurationResponseDTO {
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

    public QidDiscoverySearchConfigurationResponseDTO(QidDiscoveryConfigurationVersion version) {
        this.searchType = version.getSearchType().name();
        this.exactSearchMaxCandidateCount = version.getExactSearchMaxCandidateCount();
        this.maxCombinationSize = version.getMaxCombinationSize();
        this.beamWidth = version.getBeamWidth();
        this.minImprovement = version.getMinImprovement();
        this.stagnationDepthLimit = version.getStagnationDepthLimit();
        this.targetDistinction = version.getTargetDistinction();
        this.targetSeparation = version.getTargetSeparation();
        this.distinctionWeight = version.getDistinctionWeight();
        this.separationWeight = version.getSeparationWeight();
        this.attributeCountPenalty = version.getAttributeCountPenalty();
        this.maxPersistedCombinations = version.getMaxPersistedCombinations();
    }
}
