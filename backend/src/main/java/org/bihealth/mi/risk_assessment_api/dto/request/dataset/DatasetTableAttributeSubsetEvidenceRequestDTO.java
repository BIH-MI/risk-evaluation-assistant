package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttributeSubsetEvidence;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAttributeSubsetEvidenceRequestDTO {
    private Long id;
    private Integer subsetSize;
    private Long evaluatedSubsetCount;
    private Double meanDistinction;
    private Double meanSeparation;
    private Double meanSingletonFraction;

    public DatasetTableAttributeSubsetEvidence toEntity() {
        DatasetTableAttributeSubsetEvidence evidence = new DatasetTableAttributeSubsetEvidence();
        evidence.setSubsetSize(subsetSize);
        evidence.setEvaluatedSubsetCount(evaluatedSubsetCount);
        evidence.setMeanDistinction(meanDistinction);
        evidence.setMeanSeparation(meanSeparation);
        evidence.setMeanSingletonFraction(meanSingletonFraction);
        return evidence;
    }
}
