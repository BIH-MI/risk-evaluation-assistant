package org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory;

import java.util.ArrayList;
import java.util.List;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.service.DataSharingActivityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Collects the case-specific facts of one Data Sharing Activity into a
 * {@link MitigationWorkingMemory}: the activity with its assessments and requirements, the
 * Knowledge Base version to plan with, and the current REA risk result.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationWorkingMemoryFactory {

    private final DataSharingActivityService activityService;
    private final PlanningBaselineRiskLoader baselineRiskLoader;
    private final MitigationKnowledgeBaseService knowledgeBaseService;
    private final MitigationKnowledgeBaseVersionService knowledgeBaseVersionService;

    /**
     * @param manualRiskThreshold target threshold the user set on the report (a fraction), or null
     *                            to use the configured one, so the baseline matches what the user saw
     */
    public MitigationWorkingMemory create(
            Long activityId,
            String username,
            boolean isAdmin,
            Double manualRiskThreshold
    ) {
        if (manualRiskThreshold != null && (manualRiskThreshold.isNaN() || manualRiskThreshold <= 0 || manualRiskThreshold > 1)) {
            throw new IllegalArgumentException("manualRiskThreshold must be a fraction between 0 and 1.");
        }

        DataSharingActivity activity = activityService.getAccessibleActivityEntity(activityId, username, isAdmin);
        List<String> warnings = new ArrayList<>();
        if (activity.getRequirements().getSharingArrangement() == null) {
            warnings.add("Activity does not define a sharing arrangement; only actions without a "
                    + "sharing-arrangement restriction are considered.");
        }
        MitigationKnowledgeBaseVersion knowledgeBaseVersion = resolveKnowledgeBaseVersion(activity, warnings);
        return new MitigationWorkingMemory(
                activity,
                baselineRiskLoader.load(activity, manualRiskThreshold, warnings),
                manualRiskThreshold,
                knowledgeBaseVersion,
                warnings
        );
    }

    private MitigationKnowledgeBaseVersion resolveKnowledgeBaseVersion(DataSharingActivity activity, List<String> warnings) {
        if (activity.getMitigationKnowledgeBaseVersion() != null) {
            return activity.getMitigationKnowledgeBaseVersion();
        }
        warnings.add("Activity has no pinned mitigation Knowledge Base version; using the current default.");
        return knowledgeBaseVersionService.getCurrentVersion(knowledgeBaseService.resolveDefaultActiveKnowledgeBase());
    }
}
