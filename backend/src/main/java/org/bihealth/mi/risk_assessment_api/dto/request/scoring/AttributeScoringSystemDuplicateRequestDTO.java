package org.bihealth.mi.risk_assessment_api.dto.request.scoring;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional payload for duplicating a scoring system with a client-provided name.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScoringSystemDuplicateRequestDTO {
    private String name;
}
