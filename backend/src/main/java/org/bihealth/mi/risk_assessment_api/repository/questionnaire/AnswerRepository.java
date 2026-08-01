package org.bihealth.mi.risk_assessment_api.repository.questionnaire;

import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {
    void deleteByQuestion(Question question);
    boolean existsByQuestion_Configuration_Id(Long configurationId);
    boolean existsBySelectedOptionId(Long optionId);
    boolean existsByQuestionId(Long questionId);
}