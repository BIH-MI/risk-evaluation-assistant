package org.bihealth.mi.risk_assessment_api.dto.request.scoring;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Request payload for creating or editing an attribute scoring system.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttributeScoringSystemRequestDTO {
    private String name;
    private String description;
    private Boolean active;
    private Boolean defaultSystem;
    private Double defaultIdentifiabilityThreshold;
    private Double defaultSensitivityThreshold;
    private Map<String, List<AttributeScoringOptionRequestDTO>> scoreOptions;
}
