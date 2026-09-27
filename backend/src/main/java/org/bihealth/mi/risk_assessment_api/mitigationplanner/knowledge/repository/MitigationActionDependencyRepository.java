package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MitigationActionDependencyRepository extends JpaRepository<MitigationActionDependency, Long> {
    List<MitigationActionDependency> findByKnowledgeBaseVersionId(Long knowledgeBaseVersionId);
}
