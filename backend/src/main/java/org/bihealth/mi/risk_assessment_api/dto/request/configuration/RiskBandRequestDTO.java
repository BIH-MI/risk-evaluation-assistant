package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for one categorical band within a risk category.
 *
 * <p>Bands translate a normalized category score into labels such as LOW,
 * MEDIUM, or HIGH. Matrix rules and thresholds refer to these labels.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RiskBandRequestDTO {
    // Band label used in UI output, matrix conditions, and threshold matching.
    private String label;

    // Human-readable explanation of the band.
    private String description;

    // Lower bound of the normalized category score range.
    private double rangeMinimum;

    // Upper bound of the normalized category score range.
    private double rangeMaximum;

    // UI color token or hex value associated with this band.
    private String color;
}
