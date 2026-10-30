package org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory;

import java.util.List;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;

/**
 * Case-specific facts for one mitigation planning run.
 *
 * <p>The working memory is intentionally not reusable expert knowledge. It is the current state of
 * one Data Sharing Activity that is combined with a pinned mitigation Knowledge Base version during
 * inference.</p>
 *
 * @param baselineRisk         the current REA risk result, or null when it is unavailable
 * @param manualRiskThreshold  target threshold the user set on the report, or null for the configured one
 * @param knowledgeBaseVersion the Knowledge Base version to plan with
 * @param warnings             problems found while collecting the facts
 */
public record MitigationWorkingMemory(
        DataSharingActivity activity,
        BaselineRisk baselineRisk,
        Double manualRiskThreshold,
        MitigationKnowledgeBaseVersion knowledgeBaseVersion,
        List<String> warnings
) {

    public DatasetAssessment datasetAssessment() {
        return activity.getDatasetAssessment();
    }

    public RecipientAssessment recipientAssessment() {
        return activity.getRecipientAssessment();
    }

    public ActivityRequirements requirements() {
        return activity.getRequirements();
    }

    /** The activity's sharing arrangement, or null when it states none. */
    public MitigationSharingArrangement sharingArrangement() {
        MitigationSharingArrangement arrangement = requirements().getSharingArrangement();
        return arrangement == null ? null : arrangement.canonical();
    }
}
