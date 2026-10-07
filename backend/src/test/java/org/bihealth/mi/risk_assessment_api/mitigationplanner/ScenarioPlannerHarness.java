package org.bihealth.mi.risk_assessment_api.mitigationplanner;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.bihealth.mi.risk_assessment_api.config.InMemoryDemoSeed;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.BaselineRisk;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectConstraint;
import org.bihealth.mi.risk_assessment_api.dto.response.report.GenericRiskResponseDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation.CounterfactualContextEvaluator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation.MitigationPlanEstimateService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation.MitigationPlanEvaluator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.evaluation.ProjectConstraintEvaluationService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.explanation.CandidatePlanExplanationBuilder;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.InferenceResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.MitigationInferenceEngine;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.classification.DatasetAttributeRiskClassifier;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.compatibility.ProjectConstraintCompatibilityService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.driver.RiskDriverExtractorService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.matcher.ContextMitigationOpportunityMatcher;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.matcher.DataMitigationOpportunityMatcher;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.matcher.MitigationQuestionMappingMatcher;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseVersionRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.seed.MitigationKnowledgeBaseSeeder;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshotService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.MitigationKnowledgeBaseValidator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.MitigationPlanningContextFactory;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.MitigationPlanningService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.generator.CandidatePlanGenerator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.policy.PlanSelectionService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory.MitigationWorkingMemory;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.dataset.DatasetTableAssessmentAttributeRepository;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.bihealth.mi.risk_assessment_api.service.RiskService;
import org.bihealth.mi.risk_assessment_api.utils.RiskComputationService;
import org.mockito.ArgumentCaptor;

/**
 * Runs one seeded demo activity through the real planner pipeline: seeded Knowledge Base,
 * inference, candidate generation, evaluation with the real REA {@link RiskService}, and policy
 * selection. Only persistence is replaced by the in-memory {@link InMemoryDemoSeed}.
 */
final class ScenarioPlannerHarness {

    final RiskService riskService = new RiskService(new RiskComputationService(), mock(DataSharingActivityRepository.class));
    private final List<Configuration> frameworks;
    private final InMemoryDemoSeed seed;
    private final MitigationKnowledgeBaseSnapshot snapshot;
    private final MitigationInferenceEngine inference;
    final MitigationPlanEvaluator evaluator;

    ScenarioPlannerHarness(List<Configuration> frameworks, InMemoryDemoSeed seed) {
        this.frameworks = frameworks;
        this.seed = seed;
        MitigationKnowledgeBaseVersion knowledgeBase = seedKnowledgeBase();
        snapshot = new MitigationKnowledgeBaseSnapshot(1L, "KB", 1L, 1,
                knowledgeBase.getActions(), knowledgeBase.getQuestionMappings(), knowledgeBase.getAttributeMappings(),
                knowledgeBase.getParameterDefinitions(), knowledgeBase.getEstimates(), knowledgeBase.getDependencies(),
                knowledgeBase.getConflicts(), knowledgeBase.getSelectionPolicy());

        AnswerRepository answers = mock(AnswerRepository.class);
        when(answers.findAllForAssessment(anyLong())).thenAnswer(invocation -> seed.answersOf(invocation.getArgument(0)));
        DatasetTableAssessmentAttributeRepository attributes = mock(DatasetTableAssessmentAttributeRepository.class);
        when(attributes.findAllForDatasetAssessment(anyLong()))
                .thenAnswer(invocation -> seed.attributeAssessmentsOf(invocation.getArgument(0)));
        MitigationKnowledgeBaseSnapshotService snapshots = mock(MitigationKnowledgeBaseSnapshotService.class);
        when(snapshots.activeActionsByType(any(), any())).thenAnswer(invocation -> snapshot.actions().stream()
                .filter(MitigationAction::isActive)
                .filter(action -> action.getActionType() == invocation.getArgument(1, MitigationActionType.class))
                .toList());
        MitigationQuestionMappingMatcher mappingMatcher = new MitigationQuestionMappingMatcher();
        ContextMitigationOpportunityMatcher contextMatcher = new ContextMitigationOpportunityMatcher(answers, mappingMatcher);
        inference = new MitigationInferenceEngine(
                snapshots,
                new DataMitigationOpportunityMatcher(attributes,
                        mock(DataSharingActivityTableAssessmentAttributeRepository.class),
                        new DatasetAttributeRiskClassifier()),
                contextMatcher,
                new RiskDriverExtractorService(answers, mappingMatcher),
                new ProjectConstraintCompatibilityService());
        evaluator = new MitigationPlanEvaluator(
                new CounterfactualContextEvaluator(riskService, contextMatcher, inference),
                new MitigationPlanEstimateService(),
                new ProjectConstraintEvaluationService(new ProjectConstraintCompatibilityService()));
    }

    /** Inference result and planning context of one activity, as the planning service builds them. */
    MitigationPlanningContext context(
            DataSharingActivity activity,
            MitigationSharingArrangement arrangement,
            List<ProjectConstraint> constraints,
            String requiredTemporalResolution,
            BigDecimal minimumCohortRetention
    ) {
        MitigationWorkingMemory memory = new MitigationWorkingMemory(activity, new Project(),
                activity.getDatasetAssessment(), activity.getRecipientAssessment(), Map.of(), constraints,
                arrangement, "ONE_TIME", baseline(activity), null, requiredTemporalResolution,
                minimumCohortRetention, null, new ArrayList<>());
        InferenceResult inferred = inference.infer(memory, snapshot);
        return new MitigationPlanningContext(memory, snapshot, inferred, constraints, memory.baselineRisk());
    }

    MitigationCandidatePlanResponseDTO plan(MitigationPlanningContext context) {
        MitigationPlanningContextFactory contextFactory = mock(MitigationPlanningContextFactory.class);
        when(contextFactory.create(anyLong(), anyString(), anyBoolean(), any())).thenReturn(context);
        return new MitigationPlanningService(contextFactory, new CandidatePlanGenerator(), evaluator,
                new PlanSelectionService(), new CandidatePlanExplanationBuilder())
                .generate(context.workingMemory().activity().getId(), null, "user", false);
    }

    Long actionId(String code) {
        return snapshot.actions().stream().filter(action -> action.getCode().equals(code)).findFirst().orElseThrow().getId();
    }

    private BaselineRisk baseline(DataSharingActivity activity) {
        GenericRiskResponseDTO result = riskService.calculateRisk(activity, activity.getRecipientAssessment().getAnswers(), null);
        BaselineRisk baseline = new BaselineRisk();
        baseline.setAttackProbability(result.getContextRisk().getNumericValue());
        baseline.setAnonymizationThreshold(result.getFinalRisk().getNumericValue());
        baseline.setEffectiveThreshold(result.getThreshold());
        return baseline;
    }

    private MitigationKnowledgeBaseVersion seedKnowledgeBase() {
        MitigationKnowledgeBaseRepository repository = mock(MitigationKnowledgeBaseRepository.class);
        when(repository.findFirstByDefaultKnowledgeBaseTrueAndActiveTrueOrderByIdAsc()).thenReturn(Optional.empty());
        when(repository.findByNormalizedName(any())).thenReturn(Optional.empty());
        RiskConfigurationRepository configurations = mock(RiskConfigurationRepository.class);
        when(configurations.findAll()).thenReturn(frameworks);
        new MitigationKnowledgeBaseSeeder(repository,
                new MitigationKnowledgeBaseVersionService(repository, mock(MitigationKnowledgeBaseVersionRepository.class)),
                new MitigationKnowledgeBaseValidator(), configurations).run();
        ArgumentCaptor<MitigationKnowledgeBase> saved = ArgumentCaptor.forClass(MitigationKnowledgeBase.class);
        verify(repository).saveAndFlush(saved.capture());
        MitigationKnowledgeBaseVersion version = saved.getValue().getCurrentVersionEntity().orElseThrow();
        AtomicLong ids = new AtomicLong(1);
        version.getActions().forEach(action -> action.setId(ids.getAndIncrement()));
        return version;
    }

    static ProjectConstraint constraint(String key, String type, String value, String unit) {
        ProjectConstraint constraint = new ProjectConstraint();
        constraint.setKey(key);
        constraint.setLabel(key);
        constraint.setConstraintType(type);
        constraint.setValue(value);
        constraint.setUnit(unit);
        return constraint;
    }
}
