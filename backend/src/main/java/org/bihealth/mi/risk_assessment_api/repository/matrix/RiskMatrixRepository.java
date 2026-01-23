package org.bihealth.mi.risk_assessment_api.repository.matrix;

import org.bihealth.mi.risk_assessment_api.model.matrix.RiskMatrix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskMatrixRepository extends JpaRepository<RiskMatrix, Long> {
    // Optional: Add custom queries if you need to fetch specific risks
    // RiskMatrix findByPrivacyControlsAndMotivesCapacity(String privacy, String motives);
}