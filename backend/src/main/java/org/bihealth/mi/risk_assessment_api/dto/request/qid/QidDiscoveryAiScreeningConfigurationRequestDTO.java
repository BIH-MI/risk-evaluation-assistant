package org.bihealth.mi.risk_assessment_api.dto.request.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * AI-assisted direct-identifier screening settings of a QID discovery
 * configuration. Model ids are registry ids of the frontend model registry.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoveryAiScreeningConfigurationRequestDTO {
    private Boolean enabled;
    private List<String> allowedModelIds;
    private String defaultModelId;
}
