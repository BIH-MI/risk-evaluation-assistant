package org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Case-specific facts for one mitigation planning run.
 *
 * <p>The working memory is intentionally not reusable expert knowledge. It is
 * the current Project/Data Sharing Activity state that is combined with a
 * pinned mitigation Knowledge Base version during inference.</p>
 */
public record MitigationWorkingMemory(
        DataSharingActivity activity,
        Project project,
        DatasetAssessment datasetAssessment,
        RecipientAssessment recipientAssessment,
        Map<String, ProjectRequirementResponse> projectRequirementResponses,
        List<ProjectConstraint> projectConstraints,
        MitigationSharingArrangement sharingArrangement,
        String accessPattern,
        BaselineRisk baselineRisk,
        Double manualRiskThreshold,
        String requiredTemporalResolution,
        BigDecimal minimumCohortRetention,
        MitigationKnowledgeBaseVersion knowledgeBaseVersion,
        List<String> warnings
) {
}
