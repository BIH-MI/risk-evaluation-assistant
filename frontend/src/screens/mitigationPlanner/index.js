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
import PlannerSection from "./components/PlannerSection";
import ProjectRequirementSummary from "./components/ProjectRequirementSummary";
import SelectedPlanAssessment from "./components/SelectedPlanAssessment";
import useMitigationPlanBuilder from "./useMitigationPlanBuilder";
import useMitigationPlanner from "./useMitigationPlanner";

// One continuous report-style page (no tabs): Project requirements, baseline, risk drivers and
// mitigation options, candidate plans, and the selected plan's assessment. Plan evaluation happens
// on the backend; candidate plans are not persisted and stored assessments are never modified.
export default function MitigationPlannerPage() {
  const { t } = useTranslation();
  const { activityId, token, manualRiskThreshold, overview, loading, errorMessage, clearError } =
    useMitigationPlanner();
  const builder = useMitigationPlanBuilder({ activityId, token, manualRiskThreshold, overview });

  const warnings = overview?.warnings || [];

  return (
    <>
      <RABox py={8} sx={{ maxWidth: 1100, mx: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
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
                "Risk-driving findings from the current assessment are matched to configured mitigation options. Project requirements are used to identify compatible choices and unresolved constraints."
              )}
            >
              <MitigationPlanning overview={overview} builder={builder} />
            </PlannerSection>

            <PlannerSection
              id="plans"
              framed={false}
              title={t("mitigationPlanner.sections.plans", "Candidate Mitigation Plans")}
            >
              <CandidatePlanTable
                plans={builder.plans}
                selectedPlanKey={builder.selectedPlanKey}
                onSelect={builder.selectPlan}
              />
            </PlannerSection>

            {builder.selectedPlan && (
              <PlannerSection
                id="assessment"
                framed={false}
                title={t("mitigationPlanner.sections.assessment", "Selected Plan — Assessment")}
              >
                <SelectedPlanAssessment plan={builder.selectedPlan} baselineRisk={overview.baselineRisk} />
              </PlannerSection>
            )}
          </>
        )}
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          { id: "mitigationPlannerError", color: "error", message: errorMessage, onClose: clearError },
          { id: "mitigationPlanBuilderError", color: "error", message: builder.errorMessage, onClose: builder.clearError },
        ]}
      />
    </>
  );
}
