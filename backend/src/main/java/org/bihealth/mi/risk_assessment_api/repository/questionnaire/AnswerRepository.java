package org.bihealth.mi.risk_assessment_api.repository.questionnaire;

import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Integer> {
    // You can add custom queries here if you need to find specific answers
    // across all assessments.
}