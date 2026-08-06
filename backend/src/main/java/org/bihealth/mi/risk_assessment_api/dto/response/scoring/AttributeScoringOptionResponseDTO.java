package org.bihealth.mi.risk_assessment_api.dto.response.scoring;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringOption;

/**
 * Response row for one score option.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScoringOptionResponseDTO {
    private Long id;
    private String dimension;
    private String label;
    private Double value;
    private String description;
    private Integer displayOrder;

    public AttributeScoringOptionResponseDTO(AttributeScoringOption option) {
        this.id = option.getId();
        this.dimension = option.getDimension().getApiKey();
        this.label = option.getLabel();
        this.value = option.getValue();
        this.description = option.getDescription();
        this.displayOrder = option.getDisplayOrder();
    }
}
