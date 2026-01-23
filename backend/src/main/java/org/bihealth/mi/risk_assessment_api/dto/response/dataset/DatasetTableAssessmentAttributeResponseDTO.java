package org.bihealth.mi.risk_assessment_api.dto.response.dataset;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetTableAssessmentAttribute;

/**
 * Represents the assessed risk scores for a single attribute (column) in an API response.
 * This DTO shows the default risk profile for a column.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetTableAssessmentAttributeResponseDTO {
    private Integer id;
    private Integer attributeId;
    private String name;
    private Boolean directIdentifier;
    private Integer sensitivity;
    private Integer replicability;
    private Integer availability;
    private Integer distinguishability;

    /**
     * Constructor to map a DatasetTableAssessmentAttribute entity to this DTO.
     *
     * @param entity The entity to map from.
     */
    public DatasetTableAssessmentAttributeResponseDTO(DatasetTableAssessmentAttribute entity) {
        this.id                 = entity.getId();
        this.attributeId        = entity.getAttribute().getId();
        this.name               = entity.getAttribute().getName();
        this.directIdentifier   = entity.isDirectIdentifier();
        this.sensitivity        = entity.getSensitivity();
        this.replicability      = entity.getReplicability();
        this.availability       = entity.getAvailability();
        this.distinguishability = entity.getDistinguishability();
    }

    @JsonProperty("isDirectIdentifier")
    public Boolean getDirectIdentifier() {
        return directIdentifier;
    }
}