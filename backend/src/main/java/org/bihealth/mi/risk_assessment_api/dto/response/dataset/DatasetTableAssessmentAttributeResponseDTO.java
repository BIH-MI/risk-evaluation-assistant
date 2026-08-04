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
    // Attribute assessment ID and underlying dataset attribute ID.
    private Long id;
    private Long attributeId;

    // Column display name.
    private String name;
    private String dataType;

    // Default direct identifier flag for this dataset assessment.
    private Boolean directIdentifier;

    // Default S/R/A/D metric values for this attribute.
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
        this.dataType           = entity.getAttribute().getDataType().name();
        this.directIdentifier   = entity.isDirectIdentifier();
        this.sensitivity        = entity.getSensitivity();
        this.replicability      = entity.getReplicability();
        this.availability       = entity.getAvailability();
        this.distinguishability = entity.getDistinguishability();
    }

    /**
     * Preserves the frontend-facing JSON property name {@code isDirectIdentifier}.
     */
    @JsonProperty("isDirectIdentifier")
    public Boolean getDirectIdentifier() {
        return directIdentifier;
    }
}
