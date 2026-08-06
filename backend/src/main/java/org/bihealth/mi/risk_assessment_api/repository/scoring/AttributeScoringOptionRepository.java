package org.bihealth.mi.risk_assessment_api.repository.scoring;

import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AttributeScoringOptionRepository extends JpaRepository<AttributeScoringOption, Long> {
}
