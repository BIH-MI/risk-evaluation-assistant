package org.bihealth.mi.risk_assessment_api.mitigationplanner.planning;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ContextOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.Opportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ProjectFeasibility;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.RiskDriverDTO;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.ProjectConstraintResult;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverPriority;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.inference.InferenceResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshot;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.generator.CandidatePlanGenerator;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.junit.jupiter.api.Test;

class CandidatePlanGeneratorTest {

    private final CandidatePlanGenerator generator = new CandidatePlanGenerator();
    private final List<MitigationActionDependency> dependencies = new ArrayList<>();
    private final List<MitigationActionConflict> conflicts = new ArrayList<>();

    @Test
    void everyCandidateCoversActionableCriticalDrivers() {
        RiskDriverDTO critical = driver("D-CRIT", RiskDriverPriority.CRITICAL);
        RiskDriverDTO high = driver("D-HIGH", RiskDriverPriority.HIGH);
        List<Opportunity> opportunities = List.of(
                context(1L, "A_CRIT", "D-CRIT"),
                context(2L, "B_HIGH", "D-HIGH"),
                context(3L, "C_BOTH", "D-CRIT", "D-HIGH"));

        List<CandidatePlan> plans = generator.generate(planningContext(List.of(critical, high), opportunities));

        assertThat(plans).isNotEmpty();
        assertThat(plans).allSatisfy(plan -> assertThat(plan.actionIds()).containsAnyOf(1L, 3L));
        assertThat(plans).extracting(CandidatePlan::actionIds)
                .contains(List.of(1L), List.of(3L), List.of(1L, 2L));
    }

    @Test
    void doesNotProducePlansWithAnUnnecessaryAction() {
        RiskDriverDTO high = driver("D-HIGH", RiskDriverPriority.HIGH);
        List<Opportunity> opportunities = List.of(
                context(1L, "A", "D-HIGH"),
                context(2L, "B", "D-HIGH"));

        List<CandidatePlan> plans = generator.generate(planningContext(List.of(high), opportunities));

        assertThat(plans).extracting(CandidatePlan::actionIds).containsExactly(List.of(1L), List.of(2L));
    }

    @Test
    void dependenciesAreAddedAndConflictsRejected() {
        RiskDriverDTO high = driver("D-HIGH", RiskDriverPriority.HIGH);
        RiskDriverDTO other = driver("D-OTHER", RiskDriverPriority.HIGH);
        List<Opportunity> opportunities = List.of(
                context(1L, "A", "D-HIGH"),
                context(2L, "B_REQUIRED"),
                context(3L, "C", "D-OTHER"),
                context(4L, "D", "D-OTHER"));
        dependencies.add(dependency(1L, 2L));
        conflicts.add(conflict(1L, 3L));

        List<CandidatePlan> plans = generator.generate(planningContext(List.of(high, other), opportunities));

        assertThat(plans).allSatisfy(plan -> {
            if (plan.actionIds().contains(1L)) {
                assertThat(plan.actionIds()).contains(2L).doesNotContain(3L);
            }
        });
        assertThat(plans).extracting(CandidatePlan::actionIds).contains(List.of(1L, 2L, 4L));
    }

    @Test
    void hardProjectFailExcludesAction() {
        RiskDriverDTO critical = driver("D-CRIT", RiskDriverPriority.CRITICAL);
        ContextOpportunity failing = context(1L, "A", "D-CRIT");
        ProjectFeasibility feasibility = new ProjectFeasibility();
        feasibility.setResult(ProjectConstraintResult.FAIL);
        failing.setProjectFeasibility(feasibility);

        assertThat(generator.generate(planningContext(List.of(critical), List.of(failing)))).isEmpty();
    }

    @Test
    void dataAndContextOnlyStrategiesAreGenerated() {
        RiskDriverDTO dataDriver = driver("D-DATA", RiskDriverPriority.HIGH);
        RiskDriverDTO contextDriver = driver("D-CTX", RiskDriverPriority.HIGH);
        DataOpportunity data = new DataOpportunity();
        fill(data, 1L, "DATA_ACTION", MitigationActionType.DATA_TRANSFORMATION, "D-DATA");

        List<CandidatePlan> plans = generator.generate(planningContext(
                List.of(dataDriver, contextDriver), List.of(data, context(2L, "CTX_ACTION", "D-CTX"))));

        assertThat(plans).extracting(CandidatePlan::actionIds)
                .containsExactlyInAnyOrder(List.of(2L, 1L), List.of(1L), List.of(2L));
    }

    private MitigationPlanningContext planningContext(List<RiskDriverDTO> drivers, List<Opportunity> opportunities) {
        List<DataOpportunity> data = opportunities.stream()
                .filter(DataOpportunity.class::isInstance).map(DataOpportunity.class::cast).toList();
        List<ContextOpportunity> context = opportunities.stream()
                .filter(ContextOpportunity.class::isInstance).map(ContextOpportunity.class::cast).toList();
        InferenceResult inference = new InferenceResult(List.of(), drivers, data, context, List.of());
        MitigationKnowledgeBaseSnapshot snapshot = new MitigationKnowledgeBaseSnapshot(
                1L, "KB", 1L, 1, List.of(), List.of(), List.of(), List.of(), List.of(),
                dependencies, conflicts, null);
        return new MitigationPlanningContext(null, snapshot, inference, List.of(), null);
    }

    private RiskDriverDTO driver(String id, RiskDriverPriority priority) {
        RiskDriverDTO driver = new RiskDriverDTO();
        driver.setId(id);
        driver.setPriority(priority);
        driver.setActionable(true);
        return driver;
    }

    private ContextOpportunity context(Long id, String code, String... driverIds) {
        ContextOpportunity opportunity = new ContextOpportunity();
        fill(opportunity, id, code, MitigationActionType.CONTEXT_CONTROL, driverIds);
        return opportunity;
    }

    private void fill(Opportunity opportunity, Long id, String code, MitigationActionType type, String... driverIds) {
        opportunity.setActionId(id);
        opportunity.setActionCode(code);
        opportunity.setActionType(type);
        opportunity.setAddressedRiskDriverIds(List.of(driverIds));
    }

    private MitigationAction action(Long id) {
        MitigationAction action = new MitigationAction();
        action.setId(id);
        return action;
    }

    private MitigationActionDependency dependency(Long actionId, Long requiredId) {
        MitigationActionDependency dependency = new MitigationActionDependency();
        dependency.setAction(action(actionId));
        dependency.setRequiredAction(action(requiredId));
        return dependency;
    }

    private MitigationActionConflict conflict(Long left, Long right) {
        MitigationActionConflict conflict = new MitigationActionConflict();
        conflict.setActionA(action(left));
        conflict.setActionB(action(right));
        return conflict;
    }
}
