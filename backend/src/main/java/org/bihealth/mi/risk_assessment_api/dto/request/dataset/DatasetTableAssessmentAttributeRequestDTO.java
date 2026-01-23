package org.bihealth.mi.risk_assessment_api.dto.request.dataset;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableAttributeRepository;

/**
 * Represents the specific risk scores for a single table attribute (column)
 * within a dataset assessment.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAssessmentAttributeRequestDTO {
    private Integer id;
    private Integer attributeId;
    @JsonProperty("isDirectIdentifier")
    private Boolean isDirectIdentifier;
    private Integer sensitivity;
    private Integer replicability;
    private Integer availability;
    private Integer distinguishability;

    public Boolean getIsDirectIdentifier() { return isDirectIdentifier; }
    public void setIsDirectIdentifier(Boolean isDirectIdentifier) {
        this.isDirectIdentifier = isDirectIdentifier;
    }

    /**
     * Converts this DTO into a new, non-persisted DatasetTableAssessmentAttribute entity.
     *
     * @param parent        The parent DatasetTableAssessment entity.
     * @param attributeRepo The repository needed to efficiently fetch a reference to the master DatasetTableAttribute.
     * @return A new DatasetTableAssessmentAttribute entity, ready to be saved.
     */
    public DatasetTableAssessmentAttribute toEntity(
            DatasetTableAssessment parent,
            DatasetTableAttributeRepository attributeRepo
    ) {
        DatasetTableAssessmentAttribute a = new DatasetTableAssessmentAttribute();
        a.setAssessment(parent);
        a.setAttribute(attributeRepo.getReferenceById(attributeId));
        if (isDirectIdentifier != null)  a.setDirectIdentifier(isDirectIdentifier);
        a.setSensitivity(sensitivity);
        a.setReplicability(replicability);
        a.setAvailability(availability);
        a.setDistinguishability(distinguishability);
        return a;
    }
}