package org.bihealth.mi.risk_assessment_api.repository.questionnaire;

import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {
    void deleteByQuestion(Question question);
    boolean existsBySelectedOptionId(Long optionId);
    boolean existsByQuestionId(Long questionId);

    @Query("select a from Answer a join fetch a.question join fetch a.selectedOption "
            + "where a.assessment.id = :assessmentId")
    List<Answer> findAllForAssessment(@Param("assessmentId") Long assessmentId);
}
