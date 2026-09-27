import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { humanizeCode } from "../utils/mitigationPlannerFormatters";

export function formatKnowledgeBase(source) {
  if (!source?.knowledgeBaseName) return "—";
  return source.knowledgeBaseVersionNumber
    ? `${source.knowledgeBaseName} — v${source.knowledgeBaseVersionNumber}`
    : source.knowledgeBaseName;
}

/**
 * Explains a generated plan by reusing inference output: Risk Driver → matched evidence → action.
 * Coverage is structural (an action is linked to the driver), not proven effectiveness.
 */
function ActionRationaleList({ rationales }) {
  const { t } = useTranslation();
  if (!rationales?.length) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <RATypography variant="subtitle2" fontWeight="bold">
        {t("mitigationPlanner.recommendation.whyActions", "Why these actions")}
      </RATypography>
      {rationales.map((rationale) => (
        <RABox key={rationale.actionId} display="flex" flexDirection="column" gap={0.5}>
          <RATypography variant="body2" fontWeight="bold">
            {rationale.actionName}
          </RATypography>
          {rationale.riskDrivers.length === 0 ? (
            <RATypography variant="body2" sx={{ color: "text.secondary", pl: 2 }}>
              {t("mitigationPlanner.recommendation.requiredByDependency", "Included as a configured dependency of another action.")}
            </RATypography>
          ) : (
            rationale.riskDrivers.map((driver) => (
              <RATypography key={driver.riskDriverId} variant="body2" sx={{ pl: 2 }}>
                {`${humanizeCode(driver.priority)} · ${driver.categoryLabel || humanizeCode(driver.source)}: ${driver.evidence || "—"}`}
                {driver.matchedRule && (
                  <RATypography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                    {` (${driver.matchedRule})`}
                  </RATypography>
                )}
              </RATypography>
            ))
          )}
        </RABox>
      ))}
    </RABox>
  );
}

ActionRationaleList.propTypes = { rationales: PropTypes.array };
ActionRationaleList.defaultProps = { rationales: [] };

/** Plan-level summary lines, all derived by the backend from the plan's evaluation. */
function PlanSummary({ plan }) {
  const { t } = useTranslation();
  if (!plan?.planSummary?.length) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={0.5}>
      <RATypography variant="subtitle2" fontWeight="bold">
        {plan.source === "RECOMMENDED"
          ? t("mitigationPlanner.recommendation.whyPlan", "Why this plan is recommended")
          : t("mitigationPlanner.recommendation.planSummary", "Plan summary")}
      </RATypography>
      {plan.planSummary.map((line) => (
        <RATypography key={line} variant="body2" sx={{ pl: 2 }}>
          {`• ${line}`}
        </RATypography>
      ))}
    </RABox>
  );
}

PlanSummary.propTypes = { plan: PropTypes.object };
PlanSummary.defaultProps = { plan: null };

export default function PlanRecommendationPanel({ overview, recommendation, selectedPlan }) {
  const { t } = useTranslation();
  const { result, generating, generate } = recommendation;
  const generatedSelected = selectedPlan && selectedPlan.source !== "MANUAL";

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      <RABox display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
        <RATypography variant="body2">
          <strong>{t("mitigationPlanner.recommendation.knowledgeBase", "Knowledge Base")}:</strong>{" "}
          {formatKnowledgeBase(result || overview.knowledgeBase)}
        </RATypography>
        <RAButton
          variant="contained"
          onClick={generate}
          disabled={generating}
          startIcon={generating ? <CircularProgress size={18} /> : <AutoAwesomeIcon />}
        >
          {result
            ? t("mitigationPlanner.recommendation.regenerate", "Regenerate plans")
            : t("mitigationPlanner.recommendation.generate", "Generate plans")}
        </RAButton>
      </RABox>

      {result && (
        <RABox display="flex" flexDirection="column" gap={0.5}>
          <RATypography variant="body2">{result.selectionReason}</RATypography>
          <RATypography variant="caption" sx={{ color: "text.secondary" }}>
            {t(
              "mitigationPlanner.recommendation.policyNote",
              "{{count}} structurally feasible candidate(s) generated and ranked by the \"{{policy}}\" policy. The recommended plan is preferred under this policy; it is not claimed to be optimal or proven effective.",
              { count: result.generatedCandidateCount, policy: result.selectionPolicyName || "—" }
            )}
          </RATypography>
        </RABox>
      )}

      {generatedSelected && <PlanSummary plan={selectedPlan} />}
      {generatedSelected && <ActionRationaleList rationales={selectedPlan.actionRationales} />}
    </RABox>
  );
}

PlanRecommendationPanel.propTypes = {
  overview: PropTypes.shape({ knowledgeBase: PropTypes.object }).isRequired,
  recommendation: PropTypes.shape({
    result: PropTypes.object,
    generating: PropTypes.bool.isRequired,
    generate: PropTypes.func.isRequired,
  }).isRequired,
  selectedPlan: PropTypes.object,
};

PlanRecommendationPanel.defaultProps = { selectedPlan: null };
