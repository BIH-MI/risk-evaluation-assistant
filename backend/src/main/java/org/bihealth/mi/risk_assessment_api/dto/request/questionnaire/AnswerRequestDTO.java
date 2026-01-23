package org.bihealth.mi.risk_assessment_api.dto.request.questionnaire;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.AnswerOption;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;

import java.util.Map;

/**
 * Represents a single answer to a question within a larger assessment request payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnswerRequestDTO {
    private Integer questionId;
    private String answer;

    public Answer toEntity(BaseAssessment assessment, Map<Integer, Question> questionMap) {
        Question question = questionMap.get(questionId);
        if (question == null) {
            throw new IllegalArgumentException("Unknown questionId provided: " + questionId);
        }
        return new Answer(assessment, question, AnswerOption.valueOf(answer.toUpperCase()));
    }
}