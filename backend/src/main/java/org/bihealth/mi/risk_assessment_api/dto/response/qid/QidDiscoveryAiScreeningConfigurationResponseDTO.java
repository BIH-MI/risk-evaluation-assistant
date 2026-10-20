package org.bihealth.mi.risk_assessment_api.dto.response.qid;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryAiScreeningDefaults;
import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;

import java.util.List;

/**
 * AI screening settings of one configuration version. Versions saved before
 * AI screening was configurable report the defaults with
 * {@code legacyDefaults = true}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QidDiscoveryAiScreeningConfigurationResponseDTO {
    private boolean enabled;
    private List<String> allowedModelIds;
    private String defaultModelId;
    private boolean legacyDefaults;

    public QidDiscoveryAiScreeningConfigurationResponseDTO(QidDiscoveryConfigurationVersion version) {
        if (version.getAiScreeningEnabled() == null) {
            this.enabled = QidDiscoveryAiScreeningDefaults.ENABLED;
            this.allowedModelIds = QidDiscoveryAiScreeningDefaults.ALLOWED_MODEL_IDS;
            this.defaultModelId = QidDiscoveryAiScreeningDefaults.DEFAULT_MODEL_ID;
            this.legacyDefaults = true;
            return;
        }
        this.enabled = version.getAiScreeningEnabled();
        this.allowedModelIds = version.getAiAllowedModelIds() == null ? List.of() : version.getAiAllowedModelIds();
        this.defaultModelId = version.getAiDefaultModelId();
        this.legacyDefaults = false;
    }
}
