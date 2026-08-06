package org.bihealth.mi.risk_assessment_api.dto.request.scoring;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request row for one configurable attribute score option.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScoringOptionRequestDTO {
    private Long id;
    private String label;
    private Double value;
    private String description;
    private Integer displayOrder;
}
