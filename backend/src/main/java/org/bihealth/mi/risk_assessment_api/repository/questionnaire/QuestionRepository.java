package org.bihealth.mi.risk_assessment_api.repository.questionnaire;

import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Integer> {
    List<Question> findByType(String type);
}