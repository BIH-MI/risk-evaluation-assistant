package org.bihealth.mi.risk_assessment_api.repository.questionnaire;

import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;


public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByConfigurationId(Long configurationId);
    List<Question> findByConfiguration(Configuration configuration);
}