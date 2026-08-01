package org.bihealth.mi.risk_assessment_api.dto.request.questionnaire;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;

import java.util.Map;

/**
 * Request DTO for one selected questionnaire answer.
 *
 * <p>The DTO carries IDs only. During conversion, the question is resolved from
 * the active assessment's question map and the selected option is verified to
 * belong to that question.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnswerRequestDTO {
    // Question being answered.
    private Long questionId;

    // Option selected for that question.
    private Long selectedOptionId;

    /**
     * Converts the ID pair into an Answer entity linked to the supplied
     * assessment.
     *
     * <p>The option lookup is deliberately constrained to the resolved question
     * so a client cannot pair a question with an option from another question.</p>
     */
    public Answer toEntity(BaseAssessment assessment, Map<Long, Question> questionMap) {
        Question question = questionMap.get(questionId);
        if (question == null) {
            throw new IllegalArgumentException("Unknown questionId provided: " + questionId);
        }

        QuestionOption selectedOption = question.getOptions().stream()
                .filter(opt -> opt.getId().equals(selectedOptionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid option ID: " + selectedOptionId));

        return new Answer(assessment, question, selectedOption);
    }
}
