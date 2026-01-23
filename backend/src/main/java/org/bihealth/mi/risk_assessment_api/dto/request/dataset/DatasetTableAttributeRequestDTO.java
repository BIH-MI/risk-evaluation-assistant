package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;


/**
 * Represents a single attribute (column) when creating or updating a DatasetTable.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAttributeRequestDTO {
    private Integer id;
    private String name;
    private String dataType;
    private Boolean excluded;

    /**
     * Converts this DTO into a new, non-persisted DatasetTableAttribute entity.
     *
     * @param table The parent DatasetTable entity this attribute belongs to.
     * @return A new DatasetTableAttribute entity, ready to be saved.
     */
    public DatasetTableAttribute toEntity(DatasetTable table) {
        DatasetTableAttribute attr = new DatasetTableAttribute();
        attr.setTable(table);
        attr.setName(name);
        attr.setDataType(DataType.valueOf(dataType));
        attr.setExcluded(excluded);
        return attr;
    }
}