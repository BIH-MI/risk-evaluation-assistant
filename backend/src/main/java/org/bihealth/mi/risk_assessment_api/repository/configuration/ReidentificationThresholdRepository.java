package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.ReidentificationThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReidentificationThresholdRepository extends JpaRepository<ReidentificationThreshold, Integer> {

    // Fetch current-version thresholds for a configuration.
    @Query("""
            select t from ReidentificationThreshold t
            where t.configurationVersion.configuration.id = :configurationId
              and t.configurationVersion.versionNumber = (
                select max(v.versionNumber)
                from ConfigurationVersion v
                where v.configuration.id = :configurationId
              )
            """)
    List<ReidentificationThreshold> findByConfigurationId(@Param("configurationId") Long configurationId);

    List<ReidentificationThreshold> findByConfigurationVersionId(Long configurationVersionId);

    List<ReidentificationThreshold> findByConfigurationVersionIsNullAndLegacyConfigurationId(Long configurationId);
}
