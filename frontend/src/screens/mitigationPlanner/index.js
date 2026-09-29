import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useTranslation } from "react-i18next";

import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import BaselineRiskSummary from "./components/BaselineRiskSummary";
import CandidatePlanTable from "./components/CandidatePlanTable";
import CustomPlanBar from "./components/CustomPlanBar";
import MitigationPlannerHeader from "./components/MitigationPlannerHeader";
import MitigationPlanning from "./components/MitigationPlanning";
import PlannerSection from "./components/PlannerSection";
import ProjectRequirementSummary from "./components/ProjectRequirementSummary";
import SelectedPlanAssessment from "./components/SelectedPlanAssessment";
import useMitigationPlanBuilder, { CUSTOM_PLAN_KEY } from "./useMitigationPlanBuilder";
import useMitigationPlanner from "./useMitigationPlanner";
import useMitigationPlanRecommendation, { RECOMMENDED_PLAN_KEY } from "./useMitigationPlanRecommendation";
import { riskDriversById } from "./utils/mitigationPlanRows";

function Notice({ children }) {
  return (
    <RABox display="flex" alignItems="flex-start" gap={1}>
      <WarningAmberIcon fontSize="small" sx={{ color: "warning.main" }} />
      <RATypography variant="body2">{children}</RATypography>
    </RABox>
  );
}

Notice.propTypes = { children: PropTypes.node.isRequired };


export default function MitigationPlannerPage() {
  const { t } = useTranslation();

  const {
    activityId,
    token,
    manualRiskThreshold,
    overview,
    loading,
    errorMessage,
    clearError } = useMitigationPlanner();

  const recommendation = useMitigationPlanRecommendation({
    activityId,
    token,
    manualRiskThreshold,
    ready: Boolean(overview?.project),
  });
  const builder = useMitigationPlanBuilder({ activityId, token, manualRiskThreshold, overview });
  const { result, generating } = recommendation;
  const [selectedPlanKey, setSelectedPlanKey] = useState(null);

  // Generated plans keep backend order; the Custom Plan is appended and never ranked.
  const plans = useMemo(
    () => (builder.customPlan ? [...recommendation.plans, builder.customPlan] : recommendation.plans),
    [builder.customPlan, recommendation.plans]
  );

  // Each completed generation selects the Recommended Plan for review.
  useEffect(() => {
    setSelectedPlanKey(result?.recommendedPlan ? RECOMMENDED_PLAN_KEY : null);
  }, [result]);

  // If the selected plan disappears (e.g. the Custom Plan was cleared), fall back to the Recommended Plan.
  useEffect(() => {
    if (selectedPlanKey && !plans.some((plan) => plan.key === selectedPlanKey)) {
      setSelectedPlanKey(result?.recommendedPlan ? RECOMMENDED_PLAN_KEY : null);
    }
  }, [plans, result, selectedPlanKey]);

  const { evaluate } = builder;
  const evaluateCustomPlan = useCallback(async () => {
    const customPlan = await evaluate();
    if (customPlan) setSelectedPlanKey(CUSTOM_PLAN_KEY);
  }, [evaluate]);

  const selectedPlan = plans.find((plan) => plan.key === selectedPlanKey) ?? null;
  const driversById = useMemo(() => riskDriversById(overview), [overview]);
  const noFeasiblePlan = Boolean(result) && !result.recommendedPlan;
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
                  <Notice key={warning}>{warning}</Notice>
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
              <RABox display="flex" flexDirection="column" gap={3}>
                <MitigationPlanning overview={overview} builder={builder} />
                <CustomPlanBar
                  selectedCount={builder.selectedActionIds.length}
                  canEvaluate={builder.canEvaluate}
                  issues={builder.issues}
                  evaluating={builder.evaluating}
                  onEvaluate={evaluateCustomPlan}
                  onClear={builder.clear}
                />
              </RABox>
            </PlannerSection>

            {overview.project && (
              <PlannerSection
                id="plans"
                framed={false}
                mt={1}
                title={t("mitigationPlanner.sections.plans", "Candidate Mitigation Plans")}
              >
                <RABox display="flex" flexDirection="column" gap={2}>
                  {generating && (
                    <RABox display="flex" alignItems="center" gap={1.5}>
                      <CircularProgress size={20} />
                      <RATypography variant="body2">
                        {t("mitigationPlanner.plans.generating", "Generating mitigation plans...")}
                      </RATypography>
                    </RABox>
                  )}

                  {!generating && noFeasiblePlan && (
                    <Notice>
                      {t(
                        "mitigationPlanner.plans.noFeasiblePlan",
                        "No feasible mitigation plan could be generated under the current Knowledge Base and Project constraints."
                      )}
                    </Notice>
                  )}

                  {!generating && plans.length > 0 && (
                    <CandidatePlanTable
                      plans={plans}
                      selectedPlanKey={selectedPlanKey}
                      onSelect={setSelectedPlanKey}
                    />
                  )}
                </RABox>
              </PlannerSection>
            )}

            {!generating && selectedPlan && (
              <PlannerSection
                id="assessment"
                framed={false}
                title={t("mitigationPlanner.sections.assessment", "Assessment Report")}
              >
                <SelectedPlanAssessment
                  plan={selectedPlan}
                  driversById={driversById}
                />
              </PlannerSection>
            )}
          </>
        )}
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          { id: "mitigationPlannerError", color: "error", message: errorMessage, onClose: clearError },
          { id: "customPlanError", color: "error", message: builder.errorMessage, onClose: builder.clearError },
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
