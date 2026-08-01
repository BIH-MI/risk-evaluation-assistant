package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.Data;
import java.util.Map;

/**
 * Request DTO for one selectable answer option inside a configuration question.
 *
 * <p>Options carry the score used by the risk computation service when a user
 * selects the answer in a dataset or recipient assessment.</p>
 */
@Data
public class QuestionOptionRequestDTO {
    // Stable option code used by conditional questions and configuration editing.
    private String code;

    // Default display text shown when no translation is selected.
    private String text;

    // Optional localized labels keyed by language code, e.g. "en" or "de".
    private Map<String, String> textTranslations;

    // Raw option score before question/category normalization.
    private double riskLevel;

    // True when selecting this option should flag the category as high risk.
    private boolean isHighRiskTrigger;

    // Optional impact label carried by framework-specific options.
    private String impact;
}
