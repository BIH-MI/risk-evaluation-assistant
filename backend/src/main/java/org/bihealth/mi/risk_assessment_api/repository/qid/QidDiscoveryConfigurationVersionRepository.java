package org.bihealth.mi.risk_assessment_api.repository.qid;

import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfigurationVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QidDiscoveryConfigurationVersionRepository extends JpaRepository<QidDiscoveryConfigurationVersion, Long> {
    Optional<QidDiscoveryConfigurationVersion> findTopByConfigurationIdOrderByVersionNumberDesc(Long configurationId);
}
