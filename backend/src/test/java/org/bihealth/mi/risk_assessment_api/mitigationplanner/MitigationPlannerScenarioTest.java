package org.bihealth.mi.risk_assessment_api.mitigationplanner;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.bihealth.mi.risk_assessment_api.config.InMemoryDemoSeed;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationCandidatePlanResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataOpportunity;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.DataTarget;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAttributeRole;
import org.bihealth.mi.risk_assessment_api.enums.MitigationPlanStrategy;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.enums.RiskDriverSource;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.CandidatePlan;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.planning.model.MitigationPlanningContext;
import org.bihealth.mi.risk_assessment_api.testsupport.BundledFrameworks;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Runs seeded demo Data Sharing Activities through the real planner pipeline and checks that
 * it works from the current Dataset / Dataset Assessment model: attribute-level R/A/D/S and
 * Direct Identifier status only, never discovered QID combinations.
 */
class MitigationPlannerScenarioTest {

    // DataLoader's seeded SPHN scenario in which the data-transfer agreement is not yet executed.
    private static final String AGREEMENT_PENDING_ACTIVITY = "LEOSS / Swiss Research Institute, DTUA pending (SPHN)";

    private InMemoryDemoSeed seed;
    private ScenarioPlannerHarness harness;

    @BeforeEach
    void setUp() throws Exception {
        List<Configuration> frameworks = List.of(BundledFrameworks.sphn(), BundledFrameworks.elEmam());
        seed = new InMemoryDemoSeed(frameworks);
        seed.run();
        harness = new ScenarioPlannerHarness(frameworks, seed);
    }

    private MitigationPlanningContext context(String activityName) {
        DataSharingActivity activity = seed.activity(activityName);
        return harness.context(activity, MitigationSharingArrangement.CONTROLLED_DATA_TRANSFER, List.of(), null, null);
    }

    @Test
    void loadsSeededActivityWithBaselineRisk() {
        MitigationPlanningContext context = context(AGREEMENT_PENDING_ACTIVITY);

        assertThat(context.baselineRisk().getAttackProbability()).isNotNull().isPositive();
        assertThat(context.baselineRisk().getAnonymizationThreshold()).isNotNull().isPositive();
    }

    @Test
    void dataTransformationsTargetSingleCurrentDatasetAttributes() {
        MitigationPlanningContext context = context(AGREEMENT_PENDING_ACTIVITY);
        Set<String> datasetAttributes = seed.tables.stream()
                .flatMap(table -> table.getAttributes().stream())
                .map(DatasetTableAttribute::getName)
                .collect(Collectors.toSet());

        // Data risk drivers come from dataset questionnaire answers or from single assessed
        // attributes; there is no combination-level driver source.
        assertThat(context.inference().dataRiskDrivers())
                .extracting(driver -> driver.getSource())
                .containsOnly(RiskDriverSource.DATASET_QUESTION, RiskDriverSource.DATASET_ATTRIBUTE);
        assertThat(context.inference().dataRiskDrivers())
                .filteredOn(driver -> driver.getSource() == RiskDriverSource.DATASET_ATTRIBUTE)
                .isNotEmpty()
                .allSatisfy(driver -> {
                    assertThat(driver.getAttributeNames()).hasSize(1);
                    assertThat(datasetAttributes).contains(driver.getAttributeNames().get(0));
                });

        List<DataOpportunity> opportunities = context.inference().dataOpportunities();
        assertThat(opportunities).isNotEmpty();
        for (DataOpportunity opportunity : opportunities) {
            for (DataTarget target : opportunity.getMatchedTargets()) {
                assertThat(target.getAttributeNames()).hasSize(1);
                assertThat(datasetAttributes).contains(target.getAttributeNames().get(0));
            }
        }

        // Data mitigation stays attribute-level: generic suppression applies to each
        // attribute the assessor classified as a Potential QID.
        opportunities.stream()
                .filter(opportunity -> "SUPPRESS_QID_ATTRIBUTE".equals(opportunity.getActionCode()))
                .flatMap(opportunity -> opportunity.getMatchedTargets().stream())
                .forEach(target -> assertThat(target.getAttributeRole()).isEqualTo(MitigationAttributeRole.CANDIDATE_QID));
    }

    @Test
    void generatesCandidatePlansWithARecommendation() {
        MitigationCandidatePlanResponseDTO response = harness.plan(context(AGREEMENT_PENDING_ACTIVITY));

        assertThat(response.getGeneratedCandidateCount()).isPositive();
        assertThat(response.getRecommendedPlan()).isNotNull();
        assertThat(response.getRecommendedPlan().getSelectedActionCodes()).isNotEmpty();
    }

    @Test
    void customContextPlanUpdatesTheCalculatedContextRisk() {
        MitigationPlanningContext context = context(AGREEMENT_PENDING_ACTIVITY);
        // Both high-risk triggers force Controls to LOW, so only the combined safeguards
        // (executed agreement, onward-disclosure ban, audit rights) move the context risk.
        CandidatePlan customPlan = new CandidatePlan(
                context.inference().contextOpportunities().stream()
                        .map(opportunity -> opportunity.getActionId())
                        .toList(),
                List.of());

        MitigationPlanDraftEvaluationDTO evaluation = harness.evaluator.evaluate(context, customPlan);

        assertThat(evaluation.isContextActionsApplied()).isTrue();
        assertThat(evaluation.isContextRiskChanged()).isTrue();
        assertThat(evaluation.getCounterfactualContextResult().getProjected().getAttackProbability())
                .isLessThan(evaluation.getCounterfactualContextResult().getBaseline().getAttackProbability());
    }

    @Test
    void customDataPlanRequiresMeasuringResidualDataRisk() {
        MitigationPlanningContext context = context(AGREEMENT_PENDING_ACTIVITY);
        CandidatePlan customPlan = new CandidatePlan(List.of(harness.actionId("COARSEN_DATE")), List.of());

        MitigationPlanDraftEvaluationDTO evaluation = harness.evaluator.evaluate(context, customPlan);

        assertThat(evaluation.getStrategy()).isEqualTo(MitigationPlanStrategy.DATA);
        assertThat(evaluation.isDataRiskEvaluationRequired()).isTrue();
        assertThat(evaluation.getBaselineRequiredDataRiskThreshold())
                .isEqualTo(context.baselineRisk().getAnonymizationThreshold());
    }
}
