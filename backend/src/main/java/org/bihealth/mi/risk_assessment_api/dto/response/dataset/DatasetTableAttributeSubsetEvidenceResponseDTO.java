package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttributeSubsetEvidence;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAttributeSubsetEvidenceResponseDTO {
    private Long id;
    private Integer subsetSize;
    private Long evaluatedSubsetCount;
    private Double meanDistinction;
    private Double meanSeparation;
    private Double meanSingletonFraction;

    public DatasetTableAttributeSubsetEvidenceResponseDTO(DatasetTableAttributeSubsetEvidence entity) {
        this.id = entity.getId();
        this.subsetSize = entity.getSubsetSize();
        this.evaluatedSubsetCount = entity.getEvaluatedSubsetCount();
        this.meanDistinction = entity.getMeanDistinction();
        this.meanSeparation = entity.getMeanSeparation();
        this.meanSingletonFraction = entity.getMeanSingletonFraction();
    }
}
