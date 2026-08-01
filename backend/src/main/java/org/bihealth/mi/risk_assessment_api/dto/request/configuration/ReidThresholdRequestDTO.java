package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.Data;

/**
 * Request DTO for the re-identification threshold attached to an IMPACT band.
 *
 * <p>The selected threshold value is {@code T} in the final formula
 * {@code R_anonymization = min(1, T / P_attack)}.</p>
 */
@Data
public class ReidThresholdRequestDTO {
    // Existing threshold ID when updating; omitted when creating a new threshold.
    private Long id;

    // IMPACT/risk band label that selects this threshold.
    private String riskClassification;

    // Numeric threshold value used as T in the anonymization calculation.
    private Double thresholdValue;
}
