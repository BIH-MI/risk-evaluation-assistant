package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MitigationActionConflictRepository extends JpaRepository<MitigationActionConflict, Long> {
    List<MitigationActionConflict> findByKnowledgeBaseVersionId(Long knowledgeBaseVersionId);
}
