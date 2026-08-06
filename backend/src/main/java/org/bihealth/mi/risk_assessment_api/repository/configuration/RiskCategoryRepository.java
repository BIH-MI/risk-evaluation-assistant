package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RiskCategoryRepository extends JpaRepository<RiskCategory, Long> {

    // Returns categories from the current version of the requested configuration.
    @Query("""
            select c from RiskCategory c
            where c.configurationVersion.configuration.id = :configurationId
              and c.configurationVersion.versionNumber = (
                select max(v.versionNumber)
                from ConfigurationVersion v
                where v.configuration.id = :configurationId
              )
            """)
    List<RiskCategory> findByConfigurationId(@Param("configurationId") Long configurationId);

    List<RiskCategory> findByConfigurationVersionId(@Param("configurationVersionId") Long configurationVersionId);

    List<RiskCategory> findByConfigurationVersionIsNullAndLegacyConfigurationId(Long configurationId);
}
