package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import jakarta.persistence.EntityNotFoundException;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableAttributeRepository;

import java.util.List;
import java.util.Map;

/**
 * Represents the assessment of a single table within a larger dataset assessment request.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAssessmentRequestDTO {
    // Existing table assessment ID when updating.
    private Long id;

    // DatasetTable ID being assessed.
    private Long tableId;

    // Attribute-level assessments nested under this table assessment.
    private List<DatasetTableAssessmentAttributeRequestDTO> attributes;

    /**
     * Converts this DTO into a new, non-persisted DatasetTableAssessment entity.
     *
     * @param parent        The parent DatasetAssessment entity.
     * @param tMap          A pre-fetched map of all DatasetTable entities for efficient lookup.
     * @param attributeRepo A repository passed down to child DTOs to resolve their entity references.
     * @return A new DatasetTableAssessment entity, including its nested attributes.
     * @throws EntityNotFoundException if the tableId does not correspond to a known DatasetTable.
     */
    public DatasetTableAssessment toEntity(
            DatasetAssessment parent,
            Map<Long, DatasetTable> tMap,
            DatasetTableAttributeRepository attributeRepo
            ) {
        DatasetTable table = tMap.get(tableId);
        if (table == null) {
            throw new EntityNotFoundException("Table not found: " + tableId);
        }
        DatasetTableAssessment ta = new DatasetTableAssessment();
        ta.setDatasetAssessment(parent);
        ta.setTable(table);
        if (attributes != null) {
            attributes.forEach(attrDto ->
                    ta.getAttributes().add(attrDto.toEntity(ta, attributeRepo))
            );
        }
        return ta;
    }
}
