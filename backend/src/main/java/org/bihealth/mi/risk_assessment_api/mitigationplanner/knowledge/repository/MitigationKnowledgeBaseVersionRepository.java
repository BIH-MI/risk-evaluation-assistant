package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MitigationKnowledgeBaseVersionRepository extends JpaRepository<MitigationKnowledgeBaseVersion, Long> {
    Optional<MitigationKnowledgeBaseVersion> findTopByKnowledgeBaseIdOrderByVersionNumberDesc(Long knowledgeBaseId);
    Optional<MitigationKnowledgeBaseVersion> findByKnowledgeBaseIdAndVersionNumber(Long knowledgeBaseId, int versionNumber);
}
