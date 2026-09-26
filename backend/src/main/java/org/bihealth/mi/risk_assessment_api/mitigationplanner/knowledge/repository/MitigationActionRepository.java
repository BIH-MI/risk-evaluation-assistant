package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository;

import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

public interface MitigationActionRepository extends JpaRepository<MitigationAction, Long> {
    Optional<MitigationAction> findByKnowledgeBaseVersionIdAndCode(Long knowledgeBaseVersionId, String code);
    boolean existsByKnowledgeBaseVersionIdAndCode(Long knowledgeBaseVersionId, String code);
    List<MitigationAction> findByKnowledgeBaseVersionIdOrderByCodeAsc(Long knowledgeBaseVersionId);
    List<MitigationAction> findByKnowledgeBaseVersionIdAndActionType(Long knowledgeBaseVersionId, MitigationActionType actionType);
    List<MitigationAction> findByKnowledgeBaseVersionIdAndActiveTrue(Long knowledgeBaseVersionId);
    List<MitigationAction> findByKnowledgeBaseVersionIdAndActionTypeAndActiveTrue(
            Long knowledgeBaseVersionId,
            MitigationActionType actionType
    );

    // The four queries below hydrate one relationship each inside the same persistence
    // context. Fetching several List relationships in one query is not possible with
    // Hibernate (MultipleBagFetchException) and would otherwise cause N+1 lazy loads.
    @Query("select distinct a from MitigationAction a left join fetch a.applicableSharingArrangements "
            + "where a.knowledgeBaseVersion.id = :versionId and a.active = true and a.actionType = :actionType")
    List<MitigationAction> findActiveWithSharingArrangements(
            @Param("versionId") Long versionId,
            @Param("actionType") MitigationActionType actionType
    );

    @Query("select distinct a from MitigationAction a left join fetch a.questionMappings m "
            + "left join fetch m.configuration where a in :actions")
    List<MitigationAction> fetchQuestionMappings(@Param("actions") Collection<MitigationAction> actions);

    @Query("select distinct a from MitigationAction a left join fetch a.attributeMappings where a in :actions")
    List<MitigationAction> fetchAttributeMappings(@Param("actions") Collection<MitigationAction> actions);

    @Query("select distinct a from MitigationAction a left join fetch a.parameterDefinitions where a in :actions")
    List<MitigationAction> fetchParameterDefinitions(@Param("actions") Collection<MitigationAction> actions);

    // Allowed values are hydrated separately: fetching them together with the parameterDefinitions
    // bag multiplies each definition once per allowed value (duplicate parameters in the planner).
    @Query("select distinct p from MitigationParameterDefinition p left join fetch p.allowedValues "
            + "where p.mitigationAction in :actions")
    List<MitigationParameterDefinition> fetchParameterAllowedValues(@Param("actions") Collection<MitigationAction> actions);
}
