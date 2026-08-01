package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.enums.RiskClassification;
import org.bihealth.mi.risk_assessment_api.model.configuration.ReidentificationThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReidentificationThresholdRepository extends JpaRepository<ReidentificationThreshold, Integer> {

    // 1. Fetch all thresholds for a configuration (for UI Configuration tab)
    List<ReidentificationThreshold> findByConfigurationId(Long configurationId);

    // 2. Fetch a specific threshold for calculation (e.g., Get "HIGH" threshold for Config #5)
    Optional<ReidentificationThreshold> findByConfigurationIdAndRiskClassification(
            Long configurationId,
            RiskClassification riskClassification
    );
}