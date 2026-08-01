package org.bihealth.mi.risk_assessment_api.dto.request.activity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;

/**
 * Represents the specific risk scores for a single table attribute (column)
 * within the context of a data sharing activity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSharingActivityTableAttributeAssessmentRequestDTO {
    // Existing activity-specific attribute assessment ID when updating.
    private Long id;

    // ID of the dataset attribute assessment being overridden.
    private Long attributeId;

    // Activity-specific S/R/A/D metric values.
    private int sensitivity;
    private int replicability;
    private int availability;
    private int distinguishability;

    // Whether this column should be treated as a direct identifier in this activity.
    private Boolean directIdentifier;

    /**
     * Keeps the JSON property name aligned with frontend payloads that send
     * {@code isDirectIdentifier}.
     */
    @JsonProperty("isDirectIdentifier")
    public Boolean getDirectIdentifier() {
        return directIdentifier;
    }

    /**
     * Converts this DTO into a new, non-persisted DataSharingActivityTableAssessmentAttribute entity.
     *
     * @param parent        The parent DataSharingActivityTableAssessment entity.
     * @param attributeRepo The repository needed to fetch a reference to the master attribute assessment.
     * @return A new DataSharingActivityTableAssessmentAttribute entity.
     */
    public DataSharingActivityTableAssessmentAttribute toEntity(
            DataSharingActivityTableAssessment parent,
            DatasetTableAssessmentAttributeRepository attributeRepo
    ) {
        DataSharingActivityTableAssessmentAttribute a = new DataSharingActivityTableAssessmentAttribute();
        a.setTableAssessment(parent);
        a.setTableAssessmentAttribute(attributeRepo.getReferenceById(attributeId));
        a.setSensitivity(sensitivity);
        a.setReplicability(replicability);
        a.setAvailability(availability);
        a.setDistinguishability(distinguishability);
        a.setDirectIdentifier(Boolean.TRUE.equals(directIdentifier));
        return a;
    }
}
