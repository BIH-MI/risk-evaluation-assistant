package org.bihealth.mi.risk_assessment_api.dto.response.activity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Represents an activity-specific table assessment in an API response.
 * This shows the risk score overrides for a single table within a sharing activity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSharingActivityTableAssessmentResponseDTO {
    private Integer id;
    private Integer tableId;
    private String tableName;
    private List<DataSharingActivityTableAttributeAssessmentResponseDTO> attributes;

    /**
     * Constructor to map a DataSharingActivityTableAssessment entity to this DTO.
     *
     * @param ta The entity to map from.
     */
    public DataSharingActivityTableAssessmentResponseDTO(
            DataSharingActivityTableAssessment ta
    ) {
        this.id = ta.getId();
        this.tableId = ta.getTable().getId();
        this.tableName = ta.getTable().getTable().getName();
        this.attributes = ta.getAttributes().stream()
                .sorted(Comparator.comparing(attr ->
                        attr.getTableAssessmentAttribute().getAttribute().getId()))
                .map(DataSharingActivityTableAttributeAssessmentResponseDTO::new)
                .collect(Collectors.toList());
    }
}