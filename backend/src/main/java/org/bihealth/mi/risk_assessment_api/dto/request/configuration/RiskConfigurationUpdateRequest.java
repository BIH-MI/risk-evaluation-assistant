package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * Request DTO for replacing the editable parts of a risk configuration.
 *
 * <p>This payload contains the full framework structure needed by the
 * configuration editor: metadata, categories, questions/options, matrix rules,
 * and thresholds. The service layer validates the relationships before saving.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RiskConfigurationUpdateRequest {
    // User-facing framework name.
    private String name;

    // Description/source notes shown to users selecting a framework.
    private String description;

    // Bibliographic or organizational source of the configuration.
    private String source;

    // Human-readable formula text displayed for this framework.
    private String riskFormula;

    // Default language used when translations are available.
    private String defaultLanguage;

    // Marks this configuration as the default selection.
    private boolean isDefault;

    // Inactive configurations are hidden from normal assessment creation.
    private boolean isActive;

    // Additional users who may access this configuration.
    private List<String> sharedUsernames;

    // Complete category set, including nested bands.
    private List<RiskCategoryRequestDTO> categories;

    // Complete questionnaire set, including nested options.
    private List<QuestionRequestDTO> questions;

    // Matrix rules that map category band combinations to context-risk values.
    private List<RiskMatrixRequestDTO> riskMatrix;

    // Thresholds keyed by IMPACT classification.
    private List<ReidThresholdRequestDTO> thresholds;
}
