package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for one scoring category in a risk configuration.
 *
 * <p>Categories group questions, define whether answers increase or decrease
 * risk, and provide the bands used to classify the normalized score.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RiskCategoryRequestDTO {

    // Existing category ID when updating; omitted when creating a new category.
    private Long id;

    // Stable category code used by questions, matrices, and computation logic.
    private String code;

    // User-facing category name.
    private String name;

    // Assessment phase where this category is answered and scored.
    private String assessmentPhase;

    // Whether higher raw scores increase or decrease the final category risk.
    private String riskEffect;

    // Bands belonging to this category; no categoryCode is needed because they
    // are nested under their owning category.
    private List<RiskBandRequestDTO> riskBands;
}
