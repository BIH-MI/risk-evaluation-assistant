import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Divider } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ContextPlanAssessment from "./ContextPlanAssessment";
import DataPlanAssessment from "./DataPlanAssessment";
import HybridPlanAssessment from "./HybridPlanAssessment";
import ProjectConstraintChecks from "./ProjectConstraintChecks";
import ProjectConstraintChip from "./ProjectConstraintChip";
import { EstimateText, SectionLabel } from "./PlannerPrimitives";
import {
  formatPlanCost,
  formatPlanSetup,
  formatStrategy,
} from "../utils/mitigationPlannerFormatters";
import { planActionParameterLines } from "../utils/mitigationPlanRows";

const hasContext = (strategy) => strategy === "CONTEXT" || strategy === "HYBRID";

function PlanHeader({ label, evaluation }) {
  const { t } = useTranslation();
  return (
    <RABox display="flex" flexDirection="column" gap={1}>
      <RABox display="flex" alignItems="baseline" gap={1.5} flexWrap="wrap">
        <RATypography variant="h6" fontWeight="bold">
          {t("mitigationPlanner.plan.title", "Plan {{label}}", { label })}
        </RATypography>
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.plan.strategy", "{{strategy}} strategy", { strategy: formatStrategy(evaluation.strategy) })}
        </RATypography>
      </RABox>
      <RABox display="flex" alignItems="center" gap={3} flexWrap="wrap">
        <RABox display="flex" alignItems="center" gap={1}>
          <RATypography variant="body2" fontWeight="bold">
            {t("mitigationPlanner.plan.projectConstraints", "Project Constraints")}:
          </RATypography>
          <ProjectConstraintChip result={evaluation.projectConstraintResult} />
        </RABox>
        <RATypography variant="body2">
          <strong>{t("mitigationPlanner.plan.nextStep", "Next step")}:</strong> {evaluation.nextStep || "—"}
        </RATypography>
      </RABox>
    </RABox>
  );
}

PlanHeader.propTypes = { label: PropTypes.string.isRequired, evaluation: PropTypes.object.isRequired };

function ActionList({ title, actions }) {
  if (actions.length === 0) return null;
  return (
    <RABox>
      <SectionLabel>{title}</SectionLabel>
      <RABox component="ul" sx={{ my: 0, pl: 3 }}>
        {actions.map((action) => (
          <li key={action.actionId}>
            <RATypography variant="body2">{action.actionName}</RATypography>
            {planActionParameterLines(action).map((line) => (
              <RATypography key={line} variant="body2" sx={{ color: "text.secondary" }}>
                {line}
              </RATypography>
            ))}
          </li>
        ))}
      </RABox>
    </RABox>
  );
}

ActionList.propTypes = { title: PropTypes.string.isRequired, actions: PropTypes.array.isRequired };

function SelectedActions({ evaluation }) {
  const { t } = useTranslation();
  const actions = evaluation.actions || [];
  return (
    <RABox display="grid" gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr 1fr" }} gap={2}>
      <RABox display="flex" flexDirection="column" gap={1.5}>
        <ActionList
          title={t("mitigationPlanner.plan.transformations", "Selected transformations")}
          actions={actions.filter((action) => action.actionType === "DATA_TRANSFORMATION")}
        />
        <ActionList
          title={t("mitigationPlanner.plan.safeguards", "Selected safeguards")}
          actions={actions.filter((action) => action.actionType === "CONTEXT_CONTROL")}
        />
      </RABox>
      <RABox>
        <SectionLabel>{t("mitigationPlanner.plan.cost", "Estimated cost")}</SectionLabel>
        <EstimateText text={formatPlanCost(evaluation.costEstimate)} />
      </RABox>
      <RABox>
        <SectionLabel>{t("mitigationPlanner.plan.setup", "Estimated setup")}</SectionLabel>
        <EstimateText text={formatPlanSetup(evaluation.setupEstimate)} />
      </RABox>
    </RABox>
  );
}

SelectedActions.propTypes = { evaluation: PropTypes.object.isRequired };

function RemainingEvaluations({ items }) {
  const { t } = useTranslation();
  if (!items?.length) return null;
  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={0.75}>
        {t("mitigationPlanner.plan.remaining", "What remains to be evaluated")}
      </RATypography>
      <RABox component="ul" sx={{ my: 0, pl: 3 }}>
        {items.map((item) => (
          <li key={item}>
            <RATypography variant="body2">{item}</RATypography>
          </li>
        ))}
      </RABox>
    </RABox>
  );
}

RemainingEvaluations.propTypes = { items: PropTypes.array };
RemainingEvaluations.defaultProps = { items: [] };

function StrategyAssessment({ evaluation, baselineRisk, label }) {
  switch (evaluation.strategy) {
    case "DATA":
      return <DataPlanAssessment evaluation={evaluation} baselineRisk={baselineRisk} contextUnchanged />;
    case "CONTEXT":
      return <ContextPlanAssessment evaluation={evaluation} planLabel={label} />;
    case "HYBRID":
      return <HybridPlanAssessment evaluation={evaluation} baselineRisk={baselineRisk} planLabel={label} />;
    default:
      return null;
  }
}

StrategyAssessment.propTypes = {
  evaluation: PropTypes.object.isRequired,
  baselineRisk: PropTypes.object,
  label: PropTypes.string.isRequired,
};

StrategyAssessment.defaultProps = { baselineRisk: null };

// Plain page flow (headings, tables, dividers) without an enclosing frame.
export default function SelectedPlanAssessment({ plan, baselineRisk }) {
  const { t } = useTranslation();
  const { evaluation, label } = plan;

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <PlanHeader label={label} evaluation={evaluation} />
      <SelectedActions evaluation={evaluation} />
      <Divider />
      <StrategyAssessment evaluation={evaluation} baselineRisk={baselineRisk} label={label} />
      <Divider />
      <ProjectConstraintChecks checks={evaluation.projectChecks || []} />
      <RemainingEvaluations items={evaluation.remainingEvaluationItems} />
      {hasContext(evaluation.strategy) && (
        <RATypography variant="caption" sx={{ color: "text.secondary" }}>
          {t(
            "mitigationPlanner.plan.contextDisclaimer",
            "Projected context values are counterfactual outputs of the configured REA model. They assume the controls are implemented and verified and do not modify the stored Recipient Assessment."
          )}
        </RATypography>
      )}
    </RABox>
  );
}

SelectedPlanAssessment.propTypes = {
  plan: PropTypes.shape({
    label: PropTypes.string,
    evaluation: PropTypes.object,
  }).isRequired,
  baselineRisk: PropTypes.object,
};

SelectedPlanAssessment.defaultProps = { baselineRisk: null };
