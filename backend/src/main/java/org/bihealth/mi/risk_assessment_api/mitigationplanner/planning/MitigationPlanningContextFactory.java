package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.InferenceResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.MitigationInferenceEngine;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshotService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemory;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemoryFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds the shared context of one planning run: working memory, the pinned
 * Knowledge Base snapshot and the inference result. It is built once and then
 * reused for generating, evaluating and selecting all candidate plans.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlanningContextFactory {

    private final MitigationWorkingMemoryFactory workingMemoryFactory;
    private final MitigationKnowledgeBaseSnapshotService snapshotService;
    private final MitigationInferenceEngine inferenceEngine;

    public MitigationPlanningContext create(
            Long activityId,
            String username,
            boolean isAdmin,
            Double manualRiskThreshold
    ) {
        MitigationWorkingMemory memory = workingMemoryFactory.create(activityId, username, isAdmin, manualRiskThreshold);
        if (memory.project() == null) {
            throw new IllegalArgumentException("A Project is required before mitigation planning can be performed.");
        }
        MitigationKnowledgeBaseSnapshot knowledge = snapshotService.createSnapshot(memory.knowledgeBaseVersion());
        InferenceResult inference = inferenceEngine.infer(memory, knowledge);
        return new MitigationPlanningContext(memory, knowledge, inference, memory.projectConstraints(), memory.baselineRisk());
    }
}
