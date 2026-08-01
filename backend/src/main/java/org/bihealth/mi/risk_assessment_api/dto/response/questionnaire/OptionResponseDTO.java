package org.bihealth.mi.risk_assessment_api.dto.response.questionnaire;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;

/**
 * Response DTO for one selectable question option.
 *
 * <p>Only the fields needed for assessment display and scoring are exposed.</p>
 */
@Data
@NoArgsConstructor
public class OptionResponseDTO {
    // Display text for the option.
    private String text;

    // Raw score contributed when this option is selected.
    private double score;

    // Whether choosing this option activates a high-risk trigger.
    private boolean isHighRiskTrigger;

    /**
     * Maps a QuestionOption entity to the client response shape.
     */
    public OptionResponseDTO(QuestionOption entity) {
        if (entity != null) {
            this.text = entity.getText();
            this.score = entity.getScore();
            this.isHighRiskTrigger = entity.isHighRiskTrigger();
        }
    }
}
