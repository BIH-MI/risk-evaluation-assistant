package org.bihealth.mi.risk_assessment_api.dto.response.questionnaire;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;

@Data
@NoArgsConstructor
public class AnswerResponseDTO {
    private Integer id;
    private Integer questionId;
    private String answer;

    public AnswerResponseDTO(Answer entity) {
        this.id = entity.getId();
        this.answer = entity.getAnswer().name();
        this.questionId = entity.getQuestion().getId();
    }
}