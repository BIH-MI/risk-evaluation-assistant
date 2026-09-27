package org.bihealth.mi.risk_assessment_api.mitigationplanner.inference;

import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_BUDGET;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_SETUP_DAYS;

import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ContextOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataTarget;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.OperationalEstimate;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ParameterValue;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.PlanParameter;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationOpportunityStatus;
import org.bihealth.mi.risk_assessment_api.enums.MitigationParameterCode;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.compatibility.ProjectConstraintCompatibilityService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.driver.RiskDriverExtractorService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.matcher.ContextMitigationOpportunityMatcher;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.matcher.DataMitigationOpportunityMatcher;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshotService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Applies administrator-configured mitigation knowledge to the case-specific
 * facts of one Data Sharing Activity.
 *
 * <p>This engine derives Risk Drivers and applicable mitigation opportunities.
 * It does not calculate a new privacy-risk score, execute transformations, or
 * choose the final plan.</p>
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MitigationInferenceEngine {

    private final MitigationKnowledgeBaseSnapshotService snapshotService;
    private final DataMitigationOpportunityMatcher dataMatcher;
    private final ContextMitigationOpportunityMatcher contextMatcher;
    private final RiskDriverExtractorService riskDriverExtractor;
    private final ProjectConstraintCompatibilityService compatibilityService;

    public InferenceResult infer(MitigationWorkingMemory memory, MitigationKnowledgeBaseSnapshot knowledge) {
        List<String> warnings = new ArrayList<>();
        List<MitigationAction> dataActions = List.of();
        DataMitigationOpportunityMatcher.DatasetEvidence datasetEvidence = null;
        Map<MitigationAction, List<DataTarget>> dataMatches = Map.of();
        if (memory.datasetAssessment() != null) {
            dataActions = loadApplicableActions(knowledge, MitigationActionType.DATA_TRANSFORMATION, memory.sharingArrangement());
            datasetEvidence = dataMatcher.resolveEvidence(memory.activity(), memory.datasetAssessment());
            dataMatches = dataMatcher.match(dataActions, datasetEvidence);
        }

        List<MitigationAction> contextActions = List.of();
        Map<MitigationAction, ContextMitigationOpportunityMatcher.ContextMatch> contextMatches = Map.of();
        if (memory.recipientAssessment() != null) {
            contextActions = loadApplicableActions(knowledge, MitigationActionType.CONTEXT_CONTROL, memory.sharingArrangement());
            contextMatches = contextMatcher.match(contextActions, memory.recipientAssessment(), warnings);
        }

        RiskDriverExtractorService.ExtractedRiskDrivers drivers = riskDriverExtractor.extract(
                memory.datasetAssessment(),
                memory.recipientAssessment(),
                dataActions,
                dataMatches,
                contextActions,
                datasetEvidence
        );

        return new InferenceResult(
                drivers.dataDrivers(),
                drivers.contextDrivers(),
                buildDataOpportunities(dataActions, dataMatches, drivers.dataDrivers(),
                        memory.requiredTemporalResolution(), memory.minimumCohortRetention()),
                buildContextOpportunities(contextMatches, drivers.contextDrivers(), memory.projectConstraints()),
                warnings
        );
    }

    private List<DataOpportunity> buildDataOpportunities(
            List<MitigationAction> actions,
            Map<MitigationAction, List<DataTarget>> matches,
            List<RiskDriverDTO> dataDrivers,
            String requiredResolution,
            BigDecimal minimumRetention
    ) {
        List<DataOpportunity> opportunities = new ArrayList<>();
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
            opportunities.add(opportunity);
        }
        return opportunities;
    }

    private List<ContextOpportunity> buildContextOpportunities(
            Map<MitigationAction, ContextMitigationOpportunityMatcher.ContextMatch> matches,
            List<RiskDriverDTO> contextDrivers,
            List<ProjectConstraint> constraints
    ) {
        ProjectConstraint budget = constraint(constraints, REQ_BUDGET);
        ProjectConstraint setupLimit = constraint(constraints, REQ_SETUP_DAYS);
        List<ContextOpportunity> opportunities = new ArrayList<>();
        matches.forEach((action, match) -> {
            ContextOpportunity opportunity = new ContextOpportunity();
            fillCommon(opportunity, action, match.status());
            opportunity.setAddressedRiskDriverIds(riskDriverIdsForAction(contextDrivers, action.getId()));
            opportunity.setMatchedFindings(match.findings());
            opportunity.setProjectFeasibility(
                    compatibilityService.assessOperationalFeasibility(opportunity.getEstimate(), budget, setupLimit));
            opportunities.add(opportunity);
        });
        return opportunities;
    }

    private List<MitigationAction> loadApplicableActions(
            MitigationKnowledgeBaseSnapshot knowledge,
            MitigationActionType type,
            MitigationSharingArrangement arrangement
    ) {
        return snapshotService.activeActionsByType(knowledge, type).stream()
                .filter(action -> appliesTo(action, arrangement))
                .sorted(Comparator.comparing(MitigationAction::getCode))
                .collect(Collectors.toList());
    }

    public boolean appliesTo(MitigationAction action, MitigationSharingArrangement arrangement) {
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

    private ProjectConstraint constraint(List<ProjectConstraint> constraints, String key) {
        return constraints.stream()
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
}
