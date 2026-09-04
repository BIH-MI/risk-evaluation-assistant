package org.bihealth.mi.risk_assessment_api.dto.response.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.qid.QidSearchType;

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
        QidSearchType searchType = version.getSearchType();
        if (searchType == null) {
            /*
             * The write path (QidDiscoveryConfigurationService.buildVersion) requires
             * searchType, so a null value here means this version predates that model
             * and was never repaired by QidDiscoveryConfigurationSeeder. Fail with a
             * diagnosable message rather than a bare NullPointerException.
             */
            throw new IllegalStateException(
                    "QID discovery configuration version " + version.getId()
                            + " has no search type recorded and must be repaired before it can be served."
            );
        }

        this.searchType = searchType.name();
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
