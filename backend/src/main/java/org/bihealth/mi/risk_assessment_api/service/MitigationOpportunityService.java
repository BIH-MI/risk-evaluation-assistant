package org.bihealth.mi.risk_assessment_api.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.dto.request.risk.RiskRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ContextOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataTarget;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OpportunitySection;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationOpportunityStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.PlannerAvailability;
import org.bihealth.mi.risk_assessment_api.enums.RiskThresholdSource;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.bihealth.mi.risk_assessment_api.repository.mitigation.MitigationActionRepository;
import org.bihealth.mi.risk_assessment_api.utils.RiskResultBands;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import lombok.RequiredArgsConstructor;

/**
 * Derives the baseline and the applicable mitigation opportunities of one Data Sharing
 * Activity.
 *
 * <p>The service is strictly read-only. Opportunity extraction never updates an Answer,
 * RecipientAssessment or DatasetAssessment: projected questionnaire options are catalogue
 * metadata for a later counterfactual evaluation and must never be written back.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationOpportunityService {

    private static final String REQ_SHARING_MODEL = "sharingModel";
    private static final String REQ_TEMPORAL_RESOLUTION = "requiredTemporalResolution";
    private static final String REQ_COHORT_RETENTION = "minimumCohortRetentionPercent";
    private static final String REQ_BUDGET = "availableBudget";
    private static final String REQ_SETUP_DAYS = "maximumSetupTimeDays";
    private static final String NOT_REQUIRED = "NOT_REQUIRED";

    // Project requirements that will matter for planning, in display order.
    private static final List<String> PLANNING_REQUIREMENT_KEYS = List.of(
            "dataAccessDeadline",
            REQ_SETUP_DAYS,
            REQ_BUDGET,
            "budgetScope",
            REQ_TEMPORAL_RESOLUTION,
            REQ_COHORT_RETENTION,
            "criticalUtilityRequirement",
            "analysisDataNeeded",
            "requiredExternalDeliverables",
            REQ_SHARING_MODEL,
            "accessPattern"
    );

    private final DataSharingActivityService activityService;
    private final RiskService riskService;
    private final MitigationActionRepository actionRepository;
    private final DataMitigationOpportunityMatcher dataMatcher;
    private final ContextMitigationOpportunityMatcher contextMatcher;
    private final RiskDriverExtractorService riskDriverExtractor;
    private final ProjectConstraintCompatibilityService compatibilityService;
    private final PlatformTransactionManager transactionManager;

    /**
     * @param manualRiskThreshold target threshold the user set on the report, or null to use the
     *                            configured one; it is passed through so the baseline matches what
     *                            the user was looking at
     */
    public MitigationPlannerOverviewDTO getOpportunities(
            Long activityId, String username, boolean isAdmin, Double manualRiskThreshold
    ) {
        if (manualRiskThreshold != null && (manualRiskThreshold.isNaN() || manualRiskThreshold <= 0 || manualRiskThreshold > 1)) {
            throw new IllegalArgumentException("manualRiskThreshold must be a fraction between 0 and 1.");
        }
        DataSharingActivity activity = activityService.getAccessibleActivityEntity(activityId, username, isAdmin);
        Project project = activity.getProject();
        DatasetAssessment datasetAssessment = activity.getDatasetAssessment();
        RecipientAssessment recipientAssessment = activity.getRecipientAssessment();

        MitigationPlannerOverviewDTO overview = new MitigationPlannerOverviewDTO();
        List<String> warnings = overview.getWarnings();
        overview.setActivity(summarizeActivity(activity));
        overview.getAvailability().setDatasetAssessment(availableIf(datasetAssessment != null));
        overview.getAvailability().setRecipientAssessment(availableIf(recipientAssessment != null));

        if (project == null) {
            String reason = "A Project is required before mitigation planning can be performed.";
            warnings.add(reason);
            markUnavailable(overview.getDataOpportunities(), reason);
            markUnavailable(overview.getContextOpportunities(), reason);
            return overview;
        }

        overview.getAvailability().setProject(PlannerAvailability.AVAILABLE);
        overview.setProject(summarizeProject(project));

        Map<String, ProjectRequirementResponse> responses = currentResponses(project);
        overview.setProjectConstraints(buildConstraints(project, responses));
        MitigationSharingArrangement arrangement = resolveSharingArrangement(project, warnings);
        overview.getActivity().setSharingArrangement(arrangement);
        overview.getActivity().setAccessPattern(requirementText(responses.get("accessPattern")));

        overview.setBaselineRisk(resolveBaselineRisk(activity, overview, manualRiskThreshold, warnings));

        String requiredResolution = requirementText(responses.get(REQ_TEMPORAL_RESOLUTION));
        BigDecimal minimumRetention = requirementDecimal(responses.get(REQ_COHORT_RETENTION));

        List<MitigationAction> dataActions = List.of();
        DataMitigationOpportunityMatcher.DatasetEvidence datasetEvidence = null;
        Map<MitigationAction, List<DataTarget>> dataMatches = Map.of();
        if (datasetAssessment == null) {
            String reason = "Dataset Assessment is required to identify data-transformation opportunities.";
            markUnavailable(overview.getDataOpportunities(), reason);
            warnings.add(reason);
        } else {
            dataActions = loadApplicableActions(MitigationActionType.DATA_TRANSFORMATION, arrangement);
            datasetEvidence = dataMatcher.resolveEvidence(activity, datasetAssessment);
            dataMatches = dataMatcher.match(dataActions, datasetEvidence);
        }

        List<MitigationAction> contextActions = List.of();
        if (recipientAssessment == null) {
            String reason = "Recipient Assessment is required to identify context-control opportunities.";
            markUnavailable(overview.getContextOpportunities(), reason);
            warnings.add("Recipient Assessment is unavailable; context opportunities cannot be evaluated.");
        } else {
            contextActions = loadApplicableActions(MitigationActionType.CONTEXT_CONTROL, arrangement);
        }

        RiskDriverExtractorService.ExtractedRiskDrivers drivers = riskDriverExtractor.extract(
                datasetAssessment,
                recipientAssessment,
                dataActions,
                dataMatches,
                contextActions,
                datasetEvidence);
        overview.getRiskDrivers().setDataDrivers(drivers.dataDrivers());
        overview.getRiskDrivers().setContextDrivers(drivers.contextDrivers());

        populateDataOpportunities(overview, datasetAssessment, dataActions, dataMatches,
                drivers.dataDrivers(), requiredResolution, minimumRetention);
        populateContextOpportunities(overview, recipientAssessment, contextActions, drivers.contextDrivers(), warnings);

        boolean temporalActionPresent = overview.getDataOpportunities().getOpportunities().stream()
                .flatMap(opportunity -> opportunity.getParameters().stream())
                .anyMatch(parameter -> parameter.getParameterCode() == MitigationParameterCode.TARGET_RESOLUTION);
        if (temporalActionPresent && (requiredResolution == null || NOT_REQUIRED.equals(requiredResolution))) {
            warnings.add("Project does not define a temporal-resolution requirement.");
        }
        return overview;
    }

    // ------------------------------------------------------------------
    // Data and context sections
    // ------------------------------------------------------------------

    private void populateDataOpportunities(
            MitigationPlannerOverviewDTO overview,
            DatasetAssessment datasetAssessment,
            List<MitigationAction> actions,
            Map<MitigationAction, List<DataTarget>> matches,
            List<RiskDriverDTO> dataDrivers,
            String requiredResolution,
            BigDecimal minimumRetention
    ) {
        OpportunitySection<DataOpportunity> section = overview.getDataOpportunities();
        if (datasetAssessment == null) {
            return;
        }

        for (MitigationAction action : actions) {
            List<String> addressedDriverIds = riskDriverIdsForAction(dataDrivers, action.getId());
            List<DataTarget> targets = matches.getOrDefault(action, List.of());
            if (addressedDriverIds.isEmpty() && targets.isEmpty()) {
                continue;
            }
            DataOpportunity opportunity = new DataOpportunity();
            fillCommon(opportunity, action, MitigationOpportunityStatus.APPLICABLE);
            opportunity.setAddressedRiskDriverIds(addressedDriverIds);
            opportunity.setResultingDataForm(action.getResultingDataForm());
            opportunity.setRecordRetentionEffect(action.getRecordRetentionEffect());
            opportunity.setMatchedTargets(targets);
            opportunity.setParameters(action.getParameterDefinitions().stream()
                    .map(definition -> toParameter(definition, requiredResolution, minimumRetention))
                    .collect(Collectors.toList()));
            section.getOpportunities().add(opportunity);
        }
    }

    private void populateContextOpportunities(
            MitigationPlannerOverviewDTO overview,
            RecipientAssessment recipientAssessment,
            List<MitigationAction> actions,
            List<RiskDriverDTO> contextDrivers,
            List<String> warnings
    ) {
        OpportunitySection<ContextOpportunity> section = overview.getContextOpportunities();
        if (recipientAssessment == null) {
            return;
        }

        ProjectConstraint budget = constraint(overview, REQ_BUDGET);
        ProjectConstraint setupLimit = constraint(overview, REQ_SETUP_DAYS);
        contextMatcher.match(actions, recipientAssessment, warnings).forEach((action, match) -> {
            ContextOpportunity opportunity = new ContextOpportunity();
            fillCommon(opportunity, action, match.status());
            opportunity.setAddressedRiskDriverIds(riskDriverIdsForAction(contextDrivers, action.getId()));
            opportunity.setMatchedFindings(match.findings());
            opportunity.setProjectFeasibility(
                    compatibilityService.assessOperationalFeasibility(opportunity.getEstimate(), budget, setupLimit));
            section.getOpportunities().add(opportunity);
        });
    }

    /**
     * Loads active actions of one type, filters them by sharing arrangement first and only then
     * hydrates the mapping relationships, so filtered-out actions cost no additional queries.
     */
    private List<MitigationAction> loadApplicableActions(MitigationActionType type, MitigationSharingArrangement arrangement) {
        List<MitigationAction> actions = actionRepository.findActiveWithSharingArrangements(type).stream()
                .filter(action -> appliesTo(action, arrangement))
                .sorted((left, right) -> left.getCode().compareTo(right.getCode()))
                .collect(Collectors.toList());
        if (actions.isEmpty()) {
            return actions;
        }
        // Results are ignored on purpose: the queries hydrate the collections of the managed entities.
        actionRepository.fetchQuestionMappings(actions);
        if (type == MitigationActionType.DATA_TRANSFORMATION) {
            actionRepository.fetchAttributeMappings(actions);
            actionRepository.fetchParameterDefinitions(actions);
            actionRepository.fetchParameterAllowedValues(actions);
        }
        return actions;
    }

    boolean appliesTo(MitigationAction action, MitigationSharingArrangement arrangement) {
        if (action.getApplicableSharingArrangements() == null || action.getApplicableSharingArrangements().isEmpty()) {
            return true;
        }
        return arrangement != null && action.getApplicableSharingArrangements().stream()
                .anyMatch(candidate -> candidate.canonical() == arrangement.canonical());
    }

    private void fillCommon(
            Opportunity opportunity,
            MitigationAction action,
            MitigationOpportunityStatus status
    ) {
        opportunity.setActionId(action.getId());
        opportunity.setActionCode(action.getCode());
        opportunity.setActionName(action.getName());
        opportunity.setActionType(action.getActionType());
        opportunity.setStatus(status);
        opportunity.setDescription(action.getDescription());
        opportunity.setImplementationGuidance(action.getImplementationDescription());
        opportunity.setVerificationCriteria(action.getVerificationDescription());
        opportunity.setEvidenceReference(action.getSource());
        opportunity.setRationale(action.getRationale());

        // Missing operational estimates are UNKNOWN and must not be interpreted as zero cost
        // or zero setup time, so values are copied as-is (null stays null).
        OperationalEstimate estimate = new OperationalEstimate();
        estimate.setCostMin(action.getEstimatedCostMin());
        estimate.setCostMax(action.getEstimatedCostMax());
        estimate.setCurrency(action.getCurrency());
        estimate.setSetupDaysMin(action.getEstimatedSetupDaysMin());
        estimate.setSetupDaysMax(action.getEstimatedSetupDaysMax());
        estimate.setEstimateScope(action.getEstimateScope());
        estimate.setSource(action.getEstimateSource());
        estimate.setAssumptions(action.getEstimateAssumptions());
        opportunity.setEstimate(estimate);
    }

    private ProjectConstraint constraint(MitigationPlannerOverviewDTO overview, String key) {
        return overview.getProjectConstraints().stream()
                .filter(constraint -> key.equals(constraint.getKey()))
                .findFirst()
                .orElse(null);
    }

    private List<String> riskDriverIdsForAction(List<RiskDriverDTO> drivers, Long actionId) {
        return drivers.stream()
                .filter(driver -> driver.getMatchedMitigationActionIds().contains(actionId))
                .map(RiskDriverDTO::getId)
                .distinct()
                .collect(Collectors.toList());
    }

    private PlanParameter toParameter(
            MitigationParameterDefinition definition,
            String requiredResolution,
            BigDecimal minimumRetention
    ) {
        PlanParameter parameter = new PlanParameter();
        parameter.setParameterCode(definition.getParameterCode());
        parameter.setDescription(definition.getDescription());
        parameter.setAllowedValues(definition.getAllowedValues().stream().map(value -> {
            ParameterValue parameterValue = new ParameterValue();
            parameterValue.setValue(value);
            return parameterValue;
        }).collect(Collectors.toList()));
        compatibilityService.annotate(parameter, requiredResolution, minimumRetention);
        return parameter;
    }

    // ------------------------------------------------------------------
    // Baseline: summaries, risk and Project constraints
    // ------------------------------------------------------------------

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

    /**
     * Reuses the authoritative REA risk computation instead of re-implementing any formula.
     * It runs in its own read-only transaction so an unexpected failure cannot mark the
     * planner's transaction rollback-only.
     */
    private BaselineRisk resolveBaselineRisk(
            DataSharingActivity activity,
            MitigationPlannerOverviewDTO overview,
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

        overview.getAvailability().setRiskResult(PlannerAvailability.AVAILABLE);
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

    // Only used when the user overrode T, so the configured value can still be shown for reference.
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

    // Only responses recorded against the Project's selected template version describe its template.
    private Map<String, ProjectRequirementResponse> currentResponses(Project project) {
        Long versionId = project.getTemplateVersion() == null ? null : project.getTemplateVersion().getId();
        return project.getRequirementResponses().stream()
                .filter(response -> versionId != null
                        && response.getTemplateVersion() != null
                        && versionId.equals(response.getTemplateVersion().getId()))
                .collect(Collectors.toMap(ProjectRequirementResponse::getRequirementKey, Function.identity(), (a, b) -> a));
    }

    private List<ProjectConstraint> buildConstraints(Project project, Map<String, ProjectRequirementResponse> responses) {
        List<ProjectConstraint> constraints = new ArrayList<>();
        for (String key : PLANNING_REQUIREMENT_KEYS) {
            ProjectRequirementResponse response = responses.get(key);
            String value = responseValue(response);
            if (value == null) {
                continue; // No default is invented for requirements the Project did not define.
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

    /**
     * The sharing arrangement is fixed by the Project Template's sharing-model requirement and is
     * never changed by the planner.
     */
    MitigationSharingArrangement resolveSharingArrangement(Project project, List<String> warnings) {
        String value = requirementText(currentResponses(project).get(REQ_SHARING_MODEL));
        if (value == null) {
            value = fixedTemplateValue(project.getTemplateVersion(), REQ_SHARING_MODEL);
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

    private String fixedTemplateValue(ProjectTemplateVersion version, String key) {
        if (version == null) {
            return null;
        }
        for (ProjectTemplateSection section : version.getSections()) {
            for (ProjectTemplateRequirement requirement : section.getRequirements()) {
                if (key.equals(requirement.getStableKey()) && requirement.getFixedValue() != null
                        && !requirement.getFixedValue().isBlank()) {
                    return requirement.getFixedValue().split(",")[0];
                }
            }
        }
        return null;
    }

    private String responseValue(ProjectRequirementResponse response) {
        if (response == null) {
            return null;
        }
        return switch (response.getRequirement().getValueType()) {
            case TEXT, LONG_TEXT, YES_NO_UNKNOWN -> blankToNull(response.getTextValue());
            case INTEGER, DURATION -> response.getIntegerValue() == null ? null : response.getIntegerValue().toString();
            case DECIMAL, MONEY -> response.getDecimalValue() == null
                    ? null
                    : response.getDecimalValue().stripTrailingZeros().toPlainString();
            case DATE -> response.getDateValue() == null ? null : response.getDateValue().toString();
            case YES_NO -> response.getBooleanValue() == null ? null : (response.getBooleanValue() ? "YES" : "NO");
            case SINGLE_SELECT, MULTI_SELECT -> response.getSelectedValues() == null || response.getSelectedValues().isEmpty()
                    ? null
                    : String.join(",", response.getSelectedValues());
        };
    }

    private String requirementText(ProjectRequirementResponse response) {
        String value = responseValue(response);
        return value == null ? null : value.split(",")[0].trim().toUpperCase(Locale.ROOT);
    }

    private BigDecimal requirementDecimal(ProjectRequirementResponse response) {
        return response == null ? null : response.getDecimalValue();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private PlannerAvailability availableIf(boolean available) {
        return available ? PlannerAvailability.AVAILABLE : PlannerAvailability.MISSING;
    }

    private void markUnavailable(OpportunitySection<?> section, String reason) {
        section.setAvailability(PlannerAvailability.UNAVAILABLE);
        section.setUnavailableReason(reason);
    }
}
