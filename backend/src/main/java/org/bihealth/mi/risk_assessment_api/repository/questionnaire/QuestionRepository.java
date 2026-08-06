package org.bihealth.mi.risk_assessment_api.repository.questionnaire;

import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;


public interface QuestionRepository extends JpaRepository<Question, Long> {

    @Query("""
            select q from Question q
            where q.configurationVersion.configuration.id = :configurationId
              and q.configurationVersion.versionNumber = (
                select max(v.versionNumber)
                from ConfigurationVersion v
                where v.configuration.id = :configurationId
              )
            """)
    List<Question> findByConfigurationId(@Param("configurationId") Long configurationId);

    @Query("""
            select q from Question q
            where q.configurationVersion.configuration = :configuration
              and q.configurationVersion.versionNumber = (
                select max(v.versionNumber)
                from ConfigurationVersion v
                where v.configuration = :configuration
              )
            """)
    List<Question> findByConfiguration(@Param("configuration") Configuration configuration);

    List<Question> findByConfigurationVersionId(Long configurationVersionId);

    List<Question> findByConfigurationVersionIsNullAndLegacyConfigurationId(Long configurationId);
}
