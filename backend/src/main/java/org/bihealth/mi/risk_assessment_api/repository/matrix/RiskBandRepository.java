package org.bihealth.mi.risk_assessment_api.repository.matrix;

import org.bihealth.mi.risk_assessment_api.model.matrix.RiskBand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RiskBandRepository extends JpaRepository<RiskBand, Integer> {
}