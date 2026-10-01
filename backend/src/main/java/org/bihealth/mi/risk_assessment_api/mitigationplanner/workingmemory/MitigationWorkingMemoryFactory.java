package org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory;

import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.PLANNER_RELEVANT_REQUIREMENT_KEYS;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_ACCESS_PATTERN;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_COHORT_RETENTION;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_SHARING_MODEL;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_TEMPORAL_RESOLUTION;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.request.risk.RiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.RiskThresholdSource;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.service.DataSharingActivityService;
import org.bihealth.mi.risk_assessment_api.service.ProjectRequirementResolver;
import org.bihealth.mi.risk_assessment_api.service.RiskService;
import org.bihealth.mi.risk_assessment_api.utils.RiskResultBands;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Collects the case-specific facts of one Data Sharing Activity into a
 * {@link MitigationWorkingMemory}. Baseline risk comes from the existing REA
 * {@link RiskService}; no mitigation-specific risk score is computed here.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationWorkingMemoryFactory {

    private final DataSharingActivityService activityService;
    private final RiskService riskService;
    private final ProjectRequirementResolver requirementResolver;
    private final MitigationKnowledgeBaseService knowledgeBaseService;
    private final MitigationKnowledgeBaseVersionService knowledgeBaseVersionService;
    private final PlatformTransactionManager transactionManager;

    public MitigationWorkingMemory create(
            Long activityId,
            String username,
            boolean isAdmin,
            Double manualRiskThreshold
    ) {
        if (manualRiskThreshold != null && (manualRiskThreshold.isNaN() || manualRiskThreshold <= 0 || manualRiskThreshold > 1)) {
            throw new IllegalArgumentException("manualRiskThreshold must be a fraction between 0 and 1.");
        }

        // The planner exposes Project requirements, constraints and the pinned Knowledge Base, so
        // Project read access is required in addition to Activity read access.
        DataSharingActivity activity = activityService.getAccessibleActivityWithProject(activityId, username, isAdmin);
        Project project = activity.getProject();
        List<String> warnings = new ArrayList<>();

        if (project == null) {
            return new MitigationWorkingMemory(
                    activity,
                    null,
                    activity.getDatasetAssessment(),
                    activity.getRecipientAssessment(),
                    Map.of(),
                    List.of(),
                    null,
                    null,
                    null,
                    manualRiskThreshold,
                    null,
                    null,
                    null,
                    warnings
            );
        }

        Map<String, ProjectRequirementResponse> responses = requirementResolver.responsesByStableKey(project);
        MitigationSharingArrangement arrangement = resolveSharingArrangement(project, responses, warnings);
        String requiredResolution = requirementResolver.firstValue(responses, REQ_TEMPORAL_RESOLUTION);
        BigDecimal minimumRetention = requirementResolver.decimalValue(responses, REQ_COHORT_RETENTION);
        MitigationKnowledgeBaseVersion knowledgeBaseVersion = resolveKnowledgeBaseVersion(project, warnings);

        return new MitigationWorkingMemory(
                activity,
                project,
                activity.getDatasetAssessment(),
                activity.getRecipientAssessment(),
                responses,
                buildConstraints(project, responses),
                arrangement,
                requirementResolver.firstValue(responses, REQ_ACCESS_PATTERN),
                resolveBaselineRisk(activity, manualRiskThreshold, warnings),
                manualRiskThreshold,
                requiredResolution,
                minimumRetention,
                knowledgeBaseVersion,
                warnings
        );
    }

    private MitigationKnowledgeBaseVersion resolveKnowledgeBaseVersion(Project project, List<String> warnings) {
        if (project.getMitigationKnowledgeBaseVersion() != null) {
            return project.getMitigationKnowledgeBaseVersion();
        }
        MitigationKnowledgeBase fallback = knowledgeBaseService.resolveDefaultActiveKnowledgeBase();
        warnings.add("Project has no pinned mitigation Knowledge Base version; using the current default as a legacy fallback.");
        return knowledgeBaseVersionService.getCurrentVersion(fallback);
    }

    private BaselineRisk resolveBaselineRisk(
            DataSharingActivity activity,
            Double manualRiskThreshold,
            List<String> warnings
    ) {
        if (activity.getDatasetAssessment() == null || activity.getRecipientAssessment() == null) {
            warnings.add("Current risk result is unavailable.");
            return null;
        }

        GenericRiskResponseDTO result;
        try {
            TransactionTemplate template = new TransactionTemplate(transactionManager);
            template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            template.setReadOnly(true);
            result = template.execute(status -> riskService.calculateRisk(new RiskRequestDTO(activity.getId(), manualRiskThreshold)));
        } catch (RuntimeException ex) {
            result = null;
        }
        if (result == null) {
            warnings.add("Current risk result is unavailable.");
            return null;
        }

        BaselineRisk risk = new BaselineRisk();
        risk.setImpactBand(RiskResultBands.categoryBand(result, "IMPACT"));
        risk.setControlsBand(RiskResultBands.categoryBand(result, "CONTROLS"));
        risk.setLikelihoodBand(RiskResultBands.categoryBand(result, "LIKELIHOOD"));
        risk.setEffectiveThreshold(result.getThreshold());
        risk.setManualThreshold(manualRiskThreshold);
        risk.setThresholdSource(manualRiskThreshold == null ? RiskThresholdSource.CONFIGURED : RiskThresholdSource.MANUAL);
        risk.setConfiguredThreshold(manualRiskThreshold == null ? result.getThreshold() : configuredThreshold(activity));
        risk.setAttackProbability(result.getContextRisk() == null ? null : result.getContextRisk().getNumericValue());
        risk.setAnonymizationThreshold(result.getFinalRisk() == null ? null : result.getFinalRisk().getNumericValue());
        return risk;
    }

    private Double configuredThreshold(DataSharingActivity activity) {
        try {
            TransactionTemplate template = new TransactionTemplate(transactionManager);
            template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            template.setReadOnly(true);
            GenericRiskResponseDTO configured = template.execute(
                    status -> riskService.calculateRisk(new RiskRequestDTO(activity.getId(), null)));
            return configured == null ? null : configured.getThreshold();
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private List<ProjectConstraint> buildConstraints(Project project, Map<String, ProjectRequirementResponse> responses) {
        List<ProjectConstraint> constraints = new ArrayList<>();
        for (String key : PLANNER_RELEVANT_REQUIREMENT_KEYS) {
            ProjectRequirementResponse response = responses.get(key);
            String value = requirementResolver.displayValue(response);
            if (value == null) {
                continue;
            }
            ProjectTemplateRequirement requirement = response.getRequirement();
            ProjectConstraint constraint = new ProjectConstraint();
            constraint.setKey(key);
            constraint.setLabel(requirement.getLabel());
            constraint.setValueType(requirement.getValueType().name());
            constraint.setConstraintType(requirement.getConstraintType().name());
            constraint.setValue(value);
            constraint.setUnit(response.getUnit() != null ? response.getUnit() : requirement.getUnit());
            constraints.add(constraint);
        }
        return constraints;
    }

    public MitigationSharingArrangement resolveSharingArrangement(
            Project project,
            Map<String, ProjectRequirementResponse> responses,
            List<String> warnings
    ) {
        String value = requirementResolver.firstValue(responses, REQ_SHARING_MODEL);
        if (value == null) {
            value = requirementResolver.fixedTemplateValue(project.getTemplateVersion(), REQ_SHARING_MODEL);
        }
        if (value == null) {
            warnings.add("Project does not define a sharing arrangement; only actions without a sharing-arrangement restriction are considered.");
            return null;
        }
        try {
            return MitigationSharingArrangement.valueOf(value.trim().toUpperCase(Locale.ROOT)).canonical();
        } catch (IllegalArgumentException ex) {
            warnings.add("Project sharing model \"" + value + "\" is not a recognized sharing arrangement.");
            return null;
        }
    }
}
