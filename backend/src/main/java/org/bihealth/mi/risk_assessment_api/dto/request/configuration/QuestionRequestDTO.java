package org.bihealth.mi.risk_assessment_api.dto.request.configuration;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Request DTO for one questionnaire question in a risk configuration.
 *
 * <p>The question belongs to a category through {@code categoryCode}; selected
 * answers later contribute {@code option score * question weight} to that
 * category's classification.</p>
 */
@Data
public class QuestionRequestDTO {
    // Existing question ID when updating; omitted when creating a new question.
    private Long id;

    // Code of the RiskCategory that owns and scores this question.
    private String categoryCode;

    // Default question text shown when no translation is selected.
    private String text;

    // Optional localized question text keyed by language code.
    private Map<String, String> textTranslations;

    // Help text shown to explain why the question matters.
    private String explanation;

    // Required questions should be answered before an assessment is complete.
    private boolean isRequired = true;

    // Optional option code that controls whether this question is shown.
    private String dependsOnOptionCode;

    // Multiplier applied to the selected option score.
    private double weight;

    // Selectable answer options for this question.
    private List<QuestionOptionRequestDTO> options;
}
