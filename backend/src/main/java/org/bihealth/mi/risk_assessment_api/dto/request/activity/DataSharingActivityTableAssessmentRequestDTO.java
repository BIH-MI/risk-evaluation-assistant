package org.bihealth.mi.risk_assessment_api.dto.request.activity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentRepository;

import java.util.List;

/**
 * Represents the assessment of a single table within a data sharing activity request.
 * This is used when a user wants to provide specific risk scores for a table that
 * override the default scores in the master DatasetAssessment.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSharingActivityTableAssessmentRequestDTO {
    private Integer id;
    private Integer tableId;
    private List<DataSharingActivityTableAttributeAssessmentRequestDTO> attributes;

    /**
     * Converts this DTO into a new, non-persisted DataSharingActivityTableAssessment entity.
     *
     * @param parent        The parent DataSharingActivity entity this assessment belongs to.
     * @param tableRepo     The repository needed to fetch a reference to the master DatasetTableAssessment.
     * @param attributeRepo The repository passed down to child attribute DTOs.
     * @return A DataSharingActivityTableAssessment entity with its nested attributes.
     */
    public DataSharingActivityTableAssessment toEntity(
            DataSharingActivity parent,
            DatasetTableAssessmentRepository tableRepo,
            DatasetTableAssessmentAttributeRepository attributeRepo
    ) {
        var ta = new DataSharingActivityTableAssessment();
        ta.setDataSharingActivity(parent);
        ta.setTable(tableRepo.getReferenceById(tableId));

        for (var aDto : attributes) {
            var attr = aDto.toEntity(ta, attributeRepo);
            ta.getAttributes().add(attr);
        }
        return ta;
    }
}
