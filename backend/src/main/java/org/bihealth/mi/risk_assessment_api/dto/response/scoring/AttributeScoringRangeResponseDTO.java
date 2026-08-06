package org.bihealth.mi.risk_assessment_api.dto.response.scoring;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Minimum and maximum attainable scores for configured options.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScoringRangeResponseDTO {
    private Double min;
    private Double max;
}
