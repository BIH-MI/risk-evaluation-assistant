package org.bihealth.mi.risk_assessment_api.repository.dataset;

import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DatasetRepository extends JpaRepository<Dataset, Long> {
    List<Dataset> findByCreatorUsername(String creatorUsername);
    List<Dataset> findBySharedUsernamesContains(String username);
    long countByQidDiscoveryConfigurationId(Long qidDiscoveryConfigurationId);
    boolean existsByNormalizedName(String normalizedName);
    boolean existsByNormalizedNameAndIdNot(String normalizedName, Long id);
}
