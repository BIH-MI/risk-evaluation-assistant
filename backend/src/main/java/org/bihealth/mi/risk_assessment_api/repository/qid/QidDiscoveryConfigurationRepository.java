package org.bihealth.mi.risk_assessment_api.repository.qid;

import org.bihealth.mi.risk_assessment_api.model.qid.QidDiscoveryConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QidDiscoveryConfigurationRepository extends JpaRepository<QidDiscoveryConfiguration, Long> {
    List<QidDiscoveryConfiguration> findByActiveTrue();
    List<QidDiscoveryConfiguration> findAllByOrderByLastModifiedDateDesc();
    Optional<QidDiscoveryConfiguration> findFirstByDefaultConfigurationTrueAndActiveTrueOrderByIdAsc();
    Optional<QidDiscoveryConfiguration> findFirstByActiveTrueOrderByIdAsc();
    boolean existsByNormalizedName(String normalizedName);
    boolean existsByNormalizedNameAndIdNot(String normalizedName, Long id);
}
