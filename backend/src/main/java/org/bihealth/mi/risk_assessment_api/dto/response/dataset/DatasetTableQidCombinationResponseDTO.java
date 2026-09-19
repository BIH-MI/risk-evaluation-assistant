package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableQidCombination;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Aggregate QID-combination profile returned with a dataset table.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableQidCombinationResponseDTO {
    private Long id;
    private Long tableId;
    private List<Long> attributeIds;
    private List<String> attributeNames;
    private Integer attributeCount;
    private Double distinction;
    private Double separation;
    private Long equivalenceClassCount;
    private Long singletonClassCount;
    private Long singletonRecordCount;
    private Double singletonFraction;
    private Long minimumEquivalenceClassSize;
    private Double medianEquivalenceClassSize;
    private Long maximumEquivalenceClassSize;
    private Boolean targetSatisfied;
    private Boolean minimalQualifying;

    public DatasetTableQidCombinationResponseDTO(DatasetTableQidCombination entity) {
        List<DatasetTableAttribute> sortedAttributes = entity.getAttributes().stream()
                .sorted(Comparator.comparing(DatasetTableAttribute::getId))
                .collect(Collectors.toList());

        this.id = entity.getId();
        this.tableId = entity.getTable().getId();
        this.attributeIds = sortedAttributes.stream()
                .map(DatasetTableAttribute::getId)
                .collect(Collectors.toList());
        this.attributeNames = sortedAttributes.stream()
                .map(DatasetTableAttribute::getName)
                .collect(Collectors.toList());
        this.attributeCount = entity.getAttributeCount();
        this.distinction = entity.getDistinction();
        this.separation = entity.getSeparation();
        this.equivalenceClassCount = entity.getEquivalenceClassCount();
        this.singletonClassCount = entity.getSingletonClassCount();
        this.singletonRecordCount = entity.getSingletonRecordCount();
        this.singletonFraction = entity.getSingletonFraction();
        this.minimumEquivalenceClassSize = entity.getMinimumEquivalenceClassSize();
        this.medianEquivalenceClassSize = entity.getMedianEquivalenceClassSize();
        this.maximumEquivalenceClassSize = entity.getMaximumEquivalenceClassSize();
        this.targetSatisfied = entity.getTargetSatisfied();
        this.minimalQualifying = entity.getMinimalQualifying();
    }
}
