package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationActionConflictRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationActionDependencyRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationActionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationKnowledgeBaseSnapshotService {

    private final MitigationKnowledgeBaseService knowledgeBaseService;
    private final MitigationKnowledgeBaseVersionService versionService;
    private final MitigationActionRepository actionRepository;
    private final MitigationActionDependencyRepository dependencyRepository;
    private final MitigationActionConflictRepository conflictRepository;

    public MitigationKnowledgeBaseSnapshot createSnapshotForPlanning(Long knowledgeBaseId) {
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseService.resolveKnowledgeBaseForPlanning(knowledgeBaseId);
        return createSnapshot(versionService.getCurrentVersion(knowledgeBase));
    }

    public MitigationKnowledgeBaseSnapshot createSnapshot(MitigationKnowledgeBaseVersion version) {
        List<MitigationAction> actions = actionRepository.findByKnowledgeBaseVersionIdOrderByCodeAsc(version.getId());
        hydrateActions(actions);
        return new MitigationKnowledgeBaseSnapshot(
                version.getKnowledgeBase().getId(),
                version.getId(),
                version.getVersionNumber(),
                List.copyOf(actions),
                List.copyOf(version.getQuestionMappings()),
                List.copyOf(version.getAttributeMappings()),
                List.copyOf(version.getParameterDefinitions()),
                List.copyOf(version.getEstimates()),
                List.copyOf(dependencyRepository.findByKnowledgeBaseVersionId(version.getId())),
                List.copyOf(conflictRepository.findByKnowledgeBaseVersionId(version.getId())),
                version.getSelectionPolicy()
        );
    }

    public List<MitigationAction> activeActionsByType(
            MitigationKnowledgeBaseSnapshot snapshot,
            MitigationActionType actionType
    ) {
        return snapshot.actions().stream()
                .filter(MitigationAction::isActive)
                .filter(action -> action.getActionType() == actionType)
                .sorted(Comparator.comparing(MitigationAction::getCode))
                .toList();
    }

    private void hydrateActions(List<MitigationAction> actions) {
        if (actions.isEmpty()) {
            return;
        }
        actionRepository.fetchQuestionMappings(actions);
        actionRepository.fetchAttributeMappings(actions);
        actionRepository.fetchParameterDefinitions(actions);
        actionRepository.fetchParameterAllowedValues(actions);
    }
}
