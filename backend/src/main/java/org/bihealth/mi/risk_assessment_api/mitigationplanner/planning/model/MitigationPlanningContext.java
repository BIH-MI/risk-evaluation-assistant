package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.InferenceResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemory;

import java.util.List;

/**
 * Everything one planning run needs, computed once: case facts, the pinned
 * Knowledge Base snapshot and the inference result. Candidate generation,
 * evaluation and selection all read from the same context.
 */
public record MitigationPlanningContext(
        MitigationWorkingMemory workingMemory,
        MitigationKnowledgeBaseSnapshot knowledge,
        InferenceResult inference,
        List<ProjectConstraint> projectConstraints,
        BaselineRisk baselineRisk
) {
}
