package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.Data;
import java.util.Map;

/**
 * Request DTO for one framework matrix rule.
 *
 * <p>A matrix rule says: when the listed categories classify into the listed
 * bands, use this {@code contextRisk} value as the attack probability input
 * for the final anonymization calculation.</p>
 */
@Data
public class RiskMatrixRequestDTO {
    // Existing matrix row ID when updating; omitted when creating a new row.
    private Long id;

    // Dynamic category-to-band conditions, e.g. {"CONTROLS": "LOW",
    // "LIKELIHOOD": "HIGH"}. Category codes and band labels must match the
    // configuration exactly after normalization.
    private Map<String, String> conditions;

    // Matrix output used as P_attack/context risk by the computation service.
    private Double contextRisk;
}
