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
    }
}
