package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.activity.ActivityRequirementsDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ActivitySummary;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DatasetSummary;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.KnowledgeBaseSummary;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OpportunitySection;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RecipientSummary;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.PlannerAvailability;
import org.bihealth.mi.risk_assessment_api.enums.TemporalResolution;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.InferenceResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemory;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Assembles the read-only planner overview of one Data Sharing Activity: baseline risk, activity
 * requirements, Risk Drivers and applicable mitigation opportunities. The planning context does
 * the inference; this service only maps it to the API response.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationPlannerOverviewService {

    private final MitigationPlanningContextFactory planningContextFactory;

    /**
     * @param manualRiskThreshold target threshold the user set on the report, or null to use the
     *                            configured one, so the baseline matches what the user was looking at
     */
    public MitigationPlannerOverviewDTO getOverview(
            Long activityId, String username, boolean isAdmin, Double manualRiskThreshold
    ) {
        MitigationPlanningContext context =
                planningContextFactory.create(activityId, username, isAdmin, manualRiskThreshold);
        MitigationWorkingMemory memory = context.workingMemory();
        InferenceResult inference = context.inference();

        MitigationPlannerOverviewDTO overview = new MitigationPlannerOverviewDTO();
        overview.setActivity(summarizeActivity(memory.activity()));
        overview.setKnowledgeBase(summarizeKnowledgeBase(context.knowledge()));
        overview.setActivityRequirements(ActivityRequirementsDTO.from(memory.requirements()));
        overview.getAvailability().setDatasetAssessment(availableIf(memory.datasetAssessment() != null));
        overview.getAvailability().setRecipientAssessment(availableIf(memory.recipientAssessment() != null));
        overview.setBaselineRisk(memory.baselineRisk());
        if (memory.baselineRisk() != null) {
            overview.getAvailability().setRiskResult(PlannerAvailability.AVAILABLE);
        }
        overview.getWarnings().addAll(memory.warnings());
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
            markUnavailable(overview.getContextOpportunities(),
                    "Recipient Assessment is required to identify context-control opportunities.");
            overview.getWarnings().add("Recipient Assessment is unavailable; context opportunities cannot be evaluated.");
        } else {
            overview.getContextOpportunities().getOpportunities().addAll(inference.contextOpportunities());
        }

        if (offersTargetResolution(overview) && !requiresTemporalResolution(memory)) {
            overview.getWarnings().add("Activity does not define a temporal-resolution requirement.");
        }
        return overview;
    }

    private boolean offersTargetResolution(MitigationPlannerOverviewDTO overview) {
        return overview.getDataOpportunities().getOpportunities().stream()
                .flatMap(opportunity -> opportunity.getParameters().stream())
                .anyMatch(parameter -> parameter.getParameterCode() == MitigationParameterCode.TARGET_RESOLUTION);
    }

    private boolean requiresTemporalResolution(MitigationWorkingMemory memory) {
        TemporalResolution required = memory.requirements().getRequiredTemporalResolution();
        return required != null && required != TemporalResolution.NOT_REQUIRED;
    }

    private ActivitySummary summarizeActivity(DataSharingActivity activity) {
        ActivitySummary summary = new ActivitySummary();
        summary.setActivityId(activity.getId());
        summary.setActivityName(activity.getName());

        DatasetAssessment datasetAssessment = activity.getDatasetAssessment();
        if (datasetAssessment != null) {
            DatasetSummary dataset = new DatasetSummary();
            dataset.setDatasetId(datasetAssessment.getDataset().getId());
            dataset.setDatasetName(datasetAssessment.getDataset().getName());
            dataset.setDatasetAssessmentId(datasetAssessment.getId());
            dataset.setDatasetAssessmentName(datasetAssessment.getName());
            summary.getDatasets().add(dataset);
        }

        RecipientAssessment recipientAssessment = activity.getRecipientAssessment();
        if (recipientAssessment != null) {
            RecipientSummary recipient = new RecipientSummary();
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

    private void markUnavailable(OpportunitySection<?> section, String reason) {
        section.setAvailability(PlannerAvailability.UNAVAILABLE);
        section.setUnavailableReason(reason);
    }
}
