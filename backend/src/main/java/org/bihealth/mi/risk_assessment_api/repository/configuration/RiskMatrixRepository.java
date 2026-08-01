package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.RiskMatrix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskMatrixRepository extends JpaRepository<RiskMatrix, Long> {

    // Fetch the risk matrix rules for a specific configuration
    List<RiskMatrix> findByConfigurationId(Long configurationId);

    void deleteByConfigurationId(Long configurationId);
}