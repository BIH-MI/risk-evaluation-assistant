package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Represents a table-level assessment in an API response.
 * This shows the default risk scores for a single table.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAssessmentResponseDTO {
    private Integer id;
    private String tableName;
    private Integer tableId;
    private List<DatasetTableAssessmentAttributeResponseDTO> attributes;

    /**
     * Constructor to map a DatasetTableAssessment entity to this DTO.
     *
     * @param entity The entity to map from.
     */
    public DatasetTableAssessmentResponseDTO(DatasetTableAssessment entity) {
        this.id = entity.getId();
        this.tableName = entity.getTable().getName();
        this.tableId = entity.getTable().getId();
        this.attributes = entity.getAttributes()
                .stream()
                .sorted(Comparator.comparing(attr -> attr.getAttribute().getId()))
                .map(DatasetTableAssessmentAttributeResponseDTO::new)
                .collect(Collectors.toList());
    }
}
