package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConfigurationVersionRepository extends JpaRepository<ConfigurationVersion, Long> {
    Optional<ConfigurationVersion> findTopByConfigurationIdOrderByVersionNumberDesc(Long configurationId);
}
