import { useEffect, useMemo } from "react";
import { CircularProgress } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useTranslation } from "react-i18next";

import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import BaselineRiskSummary from "./components/BaselineRiskSummary";
import CandidatePlanTable from "./components/CandidatePlanTable";
import MitigationPlannerHeader from "./components/MitigationPlannerHeader";
import MitigationPlanning from "./components/MitigationPlanning";
import PlanRecommendationPanel from "./components/PlanRecommendationPanel";
import PlannerSection from "./components/PlannerSection";
import ProjectRequirementSummary from "./components/ProjectRequirementSummary";
import SelectedPlanAssessment from "./components/SelectedPlanAssessment";
import useMitigationPlanBuilder from "./useMitigationPlanBuilder";
import useMitigationPlanner from "./useMitigationPlanner";
import useMitigationPlanRecommendation, { RECOMMENDED_PLAN_KEY } from "./useMitigationPlanRecommendation";

// One continuous report-style page (no tabs): Project requirements, baseline, risk factors and
// applicable mitigation options, generated plans (recommended + alternatives), and the selected
// plan's assessment. Generation, evaluation and selection happen on the backend against the
// Project's pinned Knowledge Base version; plans are not persisted and assessments never change.
export default function MitigationPlannerPage() {
  const { t } = useTranslation();
  const { activityId, token, manualRiskThreshold, overview, loading, errorMessage, clearError } =
    useMitigationPlanner();
  const builder = useMitigationPlanBuilder({ activityId, token, manualRiskThreshold, overview });
  const recommendation = useMitigationPlanRecommendation({ activityId, token, manualRiskThreshold });
  const { selectPlan } = builder;

  const plans = useMemo(() => [...recommendation.plans, ...builder.plans], [recommendation.plans, builder.plans]);
  const selectedPlan = plans.find((plan) => plan.key === builder.selectedPlanKey) ?? null;

  // A fresh generation selects the recommended plan for review.
  useEffect(() => {
    if (recommendation.result?.recommendedPlan) selectPlan(RECOMMENDED_PLAN_KEY);
  }, [recommendation.result, selectPlan]);

  const warnings = overview?.warnings || [];

  return (
    <>
      <RABox py={8} sx={{ maxWidth: 1100, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        <MitigationPlannerHeader />

        {loading && (
          <RABox display="flex" justifyContent="center">
            <CircularProgress size={28} />
          </RABox>
        )}

        {overview && (
          <>
            {warnings.length > 0 && (
              <RABox display="flex" flexDirection="column" gap={0.5}>
                {warnings.map((warning) => (
                  <RABox key={warning} display="flex" alignItems="flex-start" gap={1}>
                    <WarningAmberIcon fontSize="small" sx={{ color: "warning.main" }} />
                    <RATypography variant="body2">{warning}</RATypography>
                  </RABox>
                ))}
              </RABox>
            )}

            <PlannerSection id="requirements" title={t("mitigationPlanner.sections.requirements", "Project Requirements")}>
              <ProjectRequirementSummary requirements={overview.projectConstraints || []} />
            </PlannerSection>

            <PlannerSection id="risk" framed={false} title={t("mitigationPlanner.sections.baseline", "Baseline Risk Assessment")}>
              <BaselineRiskSummary baselineRisk={overview.baselineRisk} />
            </PlannerSection>

            <PlannerSection
              id="planning"
              framed={false}
              title={t("mitigationPlanner.sections.planning", "Mitigation Planning")}
              description={t(
                "mitigationPlanner.sections.planningDescription",
                "Risk factors from the current assessment are matched to configured mitigation options. Project requirements are used to identify compatible choices and unresolved constraints."
              )}
            >
              <MitigationPlanning overview={overview} builder={builder} />
            </PlannerSection>

            <PlannerSection
              id="plans"
              framed={false}
              title={t("mitigationPlanner.sections.plans", "Candidate Mitigation Plans")}
            >
              <RABox display="flex" flexDirection="column" gap={2}>
                <PlanRecommendationPanel overview={overview} recommendation={recommendation} selectedPlan={selectedPlan} />
                <CandidatePlanTable
                  plans={plans}
                  selectedPlanKey={builder.selectedPlanKey}
                  onSelect={builder.selectPlan}
                  coverageTotals={{
                    critical: recommendation.result?.criticalDriverTotal ?? 0,
                    high: recommendation.result?.highDriverTotal ?? 0,
                  }}
                />
              </RABox>
            </PlannerSection>

            {selectedPlan && (
              <PlannerSection
                id="assessment"
                framed={false}
                title={t("mitigationPlanner.sections.assessment", "Assessment Report")}
              >
                <SelectedPlanAssessment plan={selectedPlan} baselineRisk={overview.baselineRisk} />
              </PlannerSection>
            )}
          </>
        )}
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          { id: "mitigationPlannerError", color: "error", message: errorMessage, onClose: clearError },
          { id: "mitigationPlanBuilderError", color: "error", message: builder.errorMessage, onClose: builder.clearError },
          {
            id: "mitigationPlanRecommendationError",
            color: "error",
            message: recommendation.errorMessage,
            onClose: recommendation.clearError,
          },
        ]}
      />
    </>
  );
}
