package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskConfigurationRepository extends JpaRepository<Configuration, Long> {
    List<Configuration> findByCreatorUsername(String creatorUsername);
    List<Configuration> findBySharedUsernamesContains(String username);
}