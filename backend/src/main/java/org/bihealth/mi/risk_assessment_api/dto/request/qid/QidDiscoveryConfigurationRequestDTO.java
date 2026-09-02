package org.bihealth.mi.risk_assessment_api.dto.request.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for creating or editing a QID discovery configuration.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoveryConfigurationRequestDTO {
    private String name;
    private String description;
    private Boolean active;
    private Boolean defaultConfiguration;
    private QidDiscoverySearchConfigurationRequestDTO search;
}
