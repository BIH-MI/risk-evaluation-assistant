package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.RiskMatrix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskMatrixRepository extends JpaRepository<RiskMatrix, Long> {

    // Fetch the current-version risk matrix rules for a specific configuration.
    @Query("""
            select m from RiskMatrix m
            where m.configurationVersion.configuration.id = :configurationId
              and m.configurationVersion.versionNumber = (
                select max(v.versionNumber)
                from ConfigurationVersion v
                where v.configuration.id = :configurationId
              )
            """)
    List<RiskMatrix> findByConfigurationId(@Param("configurationId") Long configurationId);

    List<RiskMatrix> findByConfigurationVersionId(Long configurationVersionId);

    List<RiskMatrix> findByConfigurationVersionIsNullAndLegacyConfigurationId(Long configurationId);
}
