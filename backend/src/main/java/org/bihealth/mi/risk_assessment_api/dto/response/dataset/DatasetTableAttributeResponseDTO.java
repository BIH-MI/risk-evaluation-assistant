package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;


/**
 * Represents a single attribute (column) of a dataset table in an API response.
 * This DTO is used to describe the basic properties of a column.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAttributeResponseDTO {
    // DatasetTableAttribute ID.
    private Long id;

    // Column name and data type.
    private String name;
    private String dataType;

    // Whether this column is excluded from relevant processing.
    private boolean excluded;

    private Long recordCount;
    private Long analysedRecordCount;
    private Long missingCount;
    private Double missingFraction;
    private Long distinctValueCount;
    private Double distinctValueRatio;
    private Long singletonValueCount;
    private Long singletonRecordCount;
    private Double singletonFraction;
    private Long minimumEquivalenceClassSize;
    private Double medianEquivalenceClassSize;
    private Long maximumEquivalenceClassSize;
    private Double distinction;
    private Double separation;

    /**
     * Constructor to map a DatasetTableAttribute entity to this DTO.
     *
     * @param entity The entity to map from.
     */
    public DatasetTableAttributeResponseDTO(DatasetTableAttribute entity) {
        this.id           = entity.getId();
        this.name         = entity.getName();
        this.dataType     = entity.getDataType().name();
        this.excluded     = entity.isExcluded();
        this.recordCount  = entity.getRecordCount();
        this.analysedRecordCount = entity.getAnalysedRecordCount();
        this.missingCount = entity.getMissingCount();
        this.missingFraction = entity.getMissingFraction();
        this.distinctValueCount = entity.getDistinctValueCount();
        this.distinctValueRatio = entity.getDistinctValueRatio();
        this.singletonValueCount = entity.getSingletonValueCount();
        this.singletonRecordCount = entity.getSingletonRecordCount();
        this.singletonFraction = entity.getSingletonFraction();
        this.minimumEquivalenceClassSize = entity.getMinimumEquivalenceClassSize();
        this.medianEquivalenceClassSize = entity.getMedianEquivalenceClassSize();
        this.maximumEquivalenceClassSize = entity.getMaximumEquivalenceClassSize();
        this.distinction = entity.getDistinction();
        this.separation = entity.getSeparation();
    }
}
