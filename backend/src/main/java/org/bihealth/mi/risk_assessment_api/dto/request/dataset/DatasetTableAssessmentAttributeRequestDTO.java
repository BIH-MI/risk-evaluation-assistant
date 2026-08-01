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
 *
 * <p>These values are the default attribute-level risk profile used by a
 * dataset assessment before any data-sharing-activity-specific overrides.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAssessmentAttributeRequestDTO {
    // Existing attribute assessment ID when updating.
    private Long id;

    // DatasetTableAttribute ID being assessed.
    private Long attributeId;

    // JSON field expected by the frontend for direct identifier status.
    @JsonProperty("isDirectIdentifier")
    private Boolean isDirectIdentifier;

    // S/R/A/D metric values used by dataset attribute assessment screens.
    private Integer sensitivity;
    private Integer replicability;
    private Integer availability;
    private Integer distinguishability;

    /**
     * Explicit getter preserves the JSON property name {@code isDirectIdentifier}
     * while keeping the backing field nullable.
     */
    public Boolean getIsDirectIdentifier() { return isDirectIdentifier; }

    /**
     * Explicit setter preserves compatibility with frontend payload naming.
     */
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
