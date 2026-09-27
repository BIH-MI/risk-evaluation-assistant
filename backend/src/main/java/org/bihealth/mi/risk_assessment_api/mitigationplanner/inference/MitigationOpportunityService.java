package org.bihealth.mi.risk_assessment_api.mitigationplanner.inference;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.KnowledgeBaseSummary;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.PlannerAvailability;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshotService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemory;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemoryFactory;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only facade for the mitigation planner overview.
 *
 * <p>Fact collection, Knowledge Base snapshot creation and inference are
 * delegated to explicit expert-system components. This service only assembles
 * the existing API response.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationOpportunityService {

    private static final String NOT_REQUIRED = "NOT_REQUIRED";

    private final MitigationWorkingMemoryFactory workingMemoryFactory;
    private final MitigationKnowledgeBaseSnapshotService snapshotService;
    private final MitigationInferenceEngine inferenceEngine;

    /**
     * @param manualRiskThreshold target threshold the user set on the report, or null to use the
     *                            configured one; it is passed through so the baseline matches what
     *                            the user was looking at
     */
    public MitigationPlannerOverviewDTO getOpportunities(
            Long activityId, String username, boolean isAdmin, Double manualRiskThreshold
    ) {
        MitigationWorkingMemory memory = workingMemoryFactory.create(activityId, username, isAdmin, manualRiskThreshold);

        MitigationPlannerOverviewDTO overview = new MitigationPlannerOverviewDTO();
        overview.setActivity(summarizeActivity(memory.activity()));
        overview.getAvailability().setDatasetAssessment(availableIf(memory.datasetAssessment() != null));
        overview.getAvailability().setRecipientAssessment(availableIf(memory.recipientAssessment() != null));
        overview.getWarnings().addAll(memory.warnings());

        if (memory.project() == null) {
            String reason = "A Project is required before mitigation planning can be performed.";
            overview.getWarnings().add(reason);
            markUnavailable(overview.getDataOpportunities(), reason);
            markUnavailable(overview.getContextOpportunities(), reason);
            return overview;
        }

        overview.getAvailability().setProject(PlannerAvailability.AVAILABLE);
        overview.setProject(summarizeProject(memory.project()));
        overview.setProjectConstraints(memory.projectConstraints());
        overview.getActivity().setSharingArrangement(memory.sharingArrangement());
        overview.getActivity().setAccessPattern(memory.accessPattern());
        overview.setBaselineRisk(memory.baselineRisk());
        if (memory.baselineRisk() != null) {
            overview.getAvailability().setRiskResult(PlannerAvailability.AVAILABLE);
        }

        MitigationKnowledgeBaseSnapshot knowledge = snapshotService.createSnapshot(memory.knowledgeBaseVersion());
        overview.setKnowledgeBase(summarizeKnowledgeBase(knowledge));

        InferenceResult inference = inferenceEngine.infer(memory, knowledge);
        overview.getWarnings().addAll(inference.warnings());
        overview.getRiskDrivers().setDataDrivers(inference.dataRiskDrivers());
        overview.getRiskDrivers().setContextDrivers(inference.contextRiskDrivers());

        if (memory.datasetAssessment() == null) {
            String reason = "Dataset Assessment is required to identify data-transformation opportunities.";
            markUnavailable(overview.getDataOpportunities(), reason);
            overview.getWarnings().add(reason);
        } else {
            overview.getDataOpportunities().getOpportunities().addAll(inference.dataOpportunities());
        }

        if (memory.recipientAssessment() == null) {
            String reason = "Recipient Assessment is required to identify context-control opportunities.";
            markUnavailable(overview.getContextOpportunities(), reason);
            overview.getWarnings().add("Recipient Assessment is unavailable; context opportunities cannot be evaluated.");
        } else {
            overview.getContextOpportunities().getOpportunities().addAll(inference.contextOpportunities());
        }

        boolean temporalActionPresent = overview.getDataOpportunities().getOpportunities().stream()
                .flatMap(opportunity -> opportunity.getParameters().stream())
                .anyMatch(parameter -> parameter.getParameterCode() == MitigationParameterCode.TARGET_RESOLUTION);

        if (temporalActionPresent
                && (memory.requiredTemporalResolution() == null || NOT_REQUIRED.equals(memory.requiredTemporalResolution()))) {
            overview.getWarnings().add("Project does not define a temporal-resolution requirement.");
        }
        return overview;
    }

    private MitigationPlannerOverviewDTO.ActivitySummary summarizeActivity(DataSharingActivity activity) {
        MitigationPlannerOverviewDTO.ActivitySummary summary = new MitigationPlannerOverviewDTO.ActivitySummary();
        summary.setActivityId(activity.getId());
        summary.setActivityName(activity.getName());

        DatasetAssessment datasetAssessment = activity.getDatasetAssessment();
        if (datasetAssessment != null) {
            MitigationPlannerOverviewDTO.DatasetSummary dataset = new MitigationPlannerOverviewDTO.DatasetSummary();
            dataset.setDatasetId(datasetAssessment.getDataset().getId());
            dataset.setDatasetName(datasetAssessment.getDataset().getName());
            dataset.setDatasetAssessmentId(datasetAssessment.getId());
            dataset.setDatasetAssessmentName(datasetAssessment.getName());
            summary.getDatasets().add(dataset);
        }

        RecipientAssessment recipientAssessment = activity.getRecipientAssessment();
        if (recipientAssessment != null) {
            MitigationPlannerOverviewDTO.RecipientSummary recipient = new MitigationPlannerOverviewDTO.RecipientSummary();
            recipient.setRecipientId(recipientAssessment.getRecipient().getId());
            recipient.setRecipientName(recipientAssessment.getRecipient().getName());
            recipient.setRecipientAssessmentId(recipientAssessment.getId());
            recipient.setRecipientAssessmentName(recipientAssessment.getName());
            recipient.setFrameworkName(recipientAssessment.getConfiguration() == null
                    ? null
                    : recipientAssessment.getConfiguration().getName());
            summary.getRecipients().add(recipient);
        }
        return summary;
    }

    private MitigationPlannerOverviewDTO.ProjectSummary summarizeProject(Project project) {
        MitigationPlannerOverviewDTO.ProjectSummary summary = new MitigationPlannerOverviewDTO.ProjectSummary();
        summary.setProjectId(project.getId());
        summary.setProjectName(project.getName());
        summary.setTemplateName(project.getTemplateVersion() == null ? null : project.getTemplateVersion().getName());
        return summary;
    }

    private KnowledgeBaseSummary summarizeKnowledgeBase(MitigationKnowledgeBaseSnapshot snapshot) {
        KnowledgeBaseSummary summary = new KnowledgeBaseSummary();
        summary.setKnowledgeBaseId(snapshot.knowledgeBaseId());
        summary.setKnowledgeBaseName(snapshot.knowledgeBaseName());
        summary.setKnowledgeBaseVersionId(snapshot.versionId());
        summary.setKnowledgeBaseVersionNumber(snapshot.versionNumber());
        return summary;
    }

    private PlannerAvailability availableIf(boolean available) {
        return available ? PlannerAvailability.AVAILABLE : PlannerAvailability.MISSING;
    }

    private void markUnavailable(MitigationPlannerOverviewDTO.OpportunitySection<?> section, String reason) {
        section.setAvailability(PlannerAvailability.UNAVAILABLE);
        section.setUnavailableReason(reason);
    }
}
