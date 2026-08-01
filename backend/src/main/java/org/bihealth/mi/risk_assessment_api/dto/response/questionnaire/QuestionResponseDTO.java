package org.bihealth.mi.risk_assessment_api.dto.response.questionnaire;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Response DTO for one questionnaire question and its answer options.
 *
 * <p>The category code lets the client group questions by risk category without
 * exposing the full RiskCategory entity graph.</p>
 */
@Data
@NoArgsConstructor
public class QuestionResponseDTO {
    // Persisted question ID.
    private Long id;

    // Owning risk category code.
    private String categoryCode;

    // Display text and optional explanatory help.
    private String text;
    private String explanation;

    // UI and validation hints for assessment forms.
    private boolean isRequired;
    private String dependsOnOptionCode;

    // Multiplier applied to selected option scores.
    private double weight;

    // Selectable answers for this question.
    private List<OptionResponseDTO> options;

    /**
     * Constructor to map a Question entity to this DTO.
     */
    public QuestionResponseDTO(Question entity) {
        if (entity != null) {
            this.id = entity.getId();
            this.categoryCode = entity.getCategory() != null ? entity.getCategory().getCode() : null;
            this.text = entity.getText();
            this.isRequired = entity.isRequired();
            this.dependsOnOptionCode = entity.getDependsOnOptionCode();
            this.weight = entity.getWeight();

            if (entity.getOptions() != null) {
                this.options = entity.getOptions().stream()
                        .map(OptionResponseDTO::new)
                        .collect(Collectors.toList());
            }
        }
    }
}
