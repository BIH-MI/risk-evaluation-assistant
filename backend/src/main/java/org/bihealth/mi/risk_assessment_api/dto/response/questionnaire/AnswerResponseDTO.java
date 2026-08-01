package org.bihealth.mi.risk_assessment_api.dto.response.questionnaire;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

/**
 * Response DTO for one persisted questionnaire answer.
 *
 * <p>The response includes both IDs and display text so the frontend can render
 * saved assessments without performing additional question/option lookups.</p>
 */
@Data
@NoArgsConstructor
public class AnswerResponseDTO {
    // Persisted Answer ID.
    private Long id;

    // Question metadata copied from the linked question.
    private Long questionId;
    private String questionText;

    // Selected option metadata copied from the linked option.
    private Long selectedOptionId;
    private String selectedOptionText;

    // Weight and option score used by the risk calculation breakdown.
    private Double weight;
    private Double score;

    /**
     * Maps a persisted Answer entity to a null-tolerant response shape.
     */
    public AnswerResponseDTO(Answer entity) {
        if (entity != null) {
            this.id = entity.getId();

            if (entity.getSelectedOption() != null) {
                this.selectedOptionId = entity.getSelectedOption().getId();
                this.selectedOptionText = entity.getSelectedOption().getText();
                this.score = entity.getSelectedOption().getScore();
            }

            Question q = entity.getQuestion();
            if (q != null) {
                this.questionId = q.getId();
                this.questionText = q.getText();
                this.weight = q.getWeight();
            }
        }
    }
}
