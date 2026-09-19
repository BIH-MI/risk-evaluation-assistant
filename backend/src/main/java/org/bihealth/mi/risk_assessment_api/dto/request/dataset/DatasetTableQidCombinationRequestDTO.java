package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableQidCombination;

import java.util.List;
import java.util.Map;

/**
 * Aggregate QID-combination profile submitted with a dataset table.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableQidCombinationRequestDTO {
    private Long id;
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

    public DatasetTableQidCombination toEntity(
            DatasetTable table,
            Map<Long, DatasetTableAttribute> attributesById,
            Map<String, DatasetTableAttribute> attributesByName
    ) {
        DatasetTableQidCombination combination = new DatasetTableQidCombination();
        combination.setTable(table);

        if (attributeIds != null && !attributeIds.isEmpty()) {
            attributeIds.stream()
                    .map(attributesById::get)
                    .filter(attribute -> attribute != null)
                    .forEach(combination.getAttributes()::add);
        } else if (attributeNames != null) {
            attributeNames.stream()
                    .map(attributesByName::get)
                    .filter(attribute -> attribute != null)
                    .forEach(combination.getAttributes()::add);
        }

        combination.setAttributeCount(combination.getAttributes().size());
        combination.setDistinction(distinction);
        combination.setSeparation(separation);
        combination.setEquivalenceClassCount(equivalenceClassCount);
        combination.setSingletonClassCount(singletonClassCount);
        combination.setSingletonRecordCount(singletonRecordCount);
        combination.setSingletonFraction(singletonFraction);
        combination.setMinimumEquivalenceClassSize(minimumEquivalenceClassSize);
        combination.setMedianEquivalenceClassSize(medianEquivalenceClassSize);
        combination.setMaximumEquivalenceClassSize(maximumEquivalenceClassSize);
        combination.setTargetSatisfied(targetSatisfied);
        combination.setMinimalQualifying(minimalQualifying);

        return combination;
    }
}
