package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MitigationKnowledgeBaseRepository extends JpaRepository<MitigationKnowledgeBase, Long> {
    List<MitigationKnowledgeBase> findByActiveTrue();
    List<MitigationKnowledgeBase> findAllByOrderByLastModifiedDateDesc();
    Optional<MitigationKnowledgeBase> findFirstByDefaultKnowledgeBaseTrueAndActiveTrueOrderByIdAsc();
    Optional<MitigationKnowledgeBase> findByNormalizedName(String normalizedName);
    boolean existsByNormalizedName(String normalizedName);
    boolean existsByNormalizedNameAndIdNot(String normalizedName, Long id);
}
