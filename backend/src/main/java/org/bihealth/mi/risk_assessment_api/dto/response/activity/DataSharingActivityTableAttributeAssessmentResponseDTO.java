package org.bihealth.mi.risk_assessment_api.dto.response.activity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.activity.DataSharingActivityTableAssessmentAttribute;

/**
 * Represents a single, activity-specific attribute assessment in an API response.
 * This shows the overridden risk scores for one column in a specific data share.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataSharingActivityTableAttributeAssessmentResponseDTO {
    // Activity-specific attribute assessment ID.
    private Long id;

    // Underlying DatasetTableAttribute ID.
    private Long attributeId;

    // Column name.
    private String name;

    // Activity-specific S/R/A/D metric values.
    private int sensitivity;
    private int replicability;
    private int availability;
    private int distinguishability;

    // Direct identifier flag exposed as isDirectIdentifier in JSON.
    private Boolean directIdentifier;

    /**
     * Preserves the frontend-facing JSON property name {@code isDirectIdentifier}.
     */
    @JsonProperty("isDirectIdentifier")
    public Boolean getDirectIdentifier() {
        return directIdentifier;
    }

    /**
     * Constructor to map a DataSharingActivityTableAssessmentAttribute entity to this DTO.
     *
     * @param attr The entity to map from.
     */
    public DataSharingActivityTableAttributeAssessmentResponseDTO(
            DataSharingActivityTableAssessmentAttribute attr
    ) {
        this.id = attr.getId();
        this.attributeId = attr.getTableAssessmentAttribute().getAttribute().getId();
        this.name = attr.getTableAssessmentAttribute().getAttribute().getName();
        this.sensitivity = attr.getSensitivity();
        this.replicability = attr.getReplicability();
        this.availability = attr.getAvailability();
        this.distinguishability = attr.getDistinguishability();
        this.directIdentifier   = attr.isDirectIdentifier();
    }
}
