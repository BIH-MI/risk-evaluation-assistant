package org.bihealth.mi.risk_assessment_api.repository.scoring;

import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystemVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttributeScoringSystemVersionRepository extends JpaRepository<AttributeScoringSystemVersion, Long> {
    Optional<AttributeScoringSystemVersion> findTopByScoringSystemIdOrderByVersionNumberDesc(Long scoringSystemId);
}
