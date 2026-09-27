import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Divider } from "@mui/material";
import EuroRoundedIcon from "@mui/icons-material/EuroRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ContextPlanAssessment from "./ContextPlanAssessment";
import DataPlanAssessment from "./DataPlanAssessment";
import HybridPlanAssessment from "./HybridPlanAssessment";
import ProjectConstraintChecks from "./ProjectConstraintChecks";
import SelectedSafeguardItem from "./SelectedSafeguardItem";
import { EstimateText, SectionLabel } from "./PlannerPrimitives";
import { formatPlanCost, formatPlanSetup } from "../utils/mitigationPlannerFormatters";
import { planActionParameterLines } from "../utils/mitigationPlanRows";

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

function SafeguardList({ title, actions, appliedChanges }) {
  if (actions.length === 0) return null;
  return (
    <RABox>
      <SectionLabel>{title}</SectionLabel>
      <RABox component="ul" sx={{ my: 0, pl: 3 }}>
        {actions.map((action) => (
          <SelectedSafeguardItem key={action.actionId} action={action} appliedChanges={appliedChanges} />
        ))}
      </RABox>
    </RABox>
  );
}

SafeguardList.propTypes = {
  title: PropTypes.string.isRequired,
  actions: PropTypes.array.isRequired,
  appliedChanges: PropTypes.array.isRequired,
};

function EstimateSummary({ title, icon, text }) {
  return (
    <RABox>
      <SectionLabel>{title}</SectionLabel>
      <RABox display="flex" alignItems="center" gap={0.75}>
        {icon}
        <EstimateText text={text} />
      </RABox>
    </RABox>
  );
}

EstimateSummary.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  text: PropTypes.string.isRequired,
};

function SelectedActions({ evaluation }) {
  const { t } = useTranslation();
  const actions = evaluation.actions || [];
  const appliedChanges = evaluation.counterfactualContextResult?.appliedQuestionChanges || [];
  return (
    <RABox display="grid" gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr 1fr" }} gap={2}>
      <RABox display="flex" flexDirection="column" gap={1.5}>
        <ActionList
          title={t("mitigationPlanner.plan.transformations", "Selected transformations")}
          actions={actions.filter((action) => action.actionType === "DATA_TRANSFORMATION")}
        />
        <SafeguardList
          title={t("mitigationPlanner.plan.safeguards", "Selected safeguards")}
          actions={actions.filter((action) => action.actionType === "CONTEXT_CONTROL")}
          appliedChanges={appliedChanges}
        />
      </RABox>
      <EstimateSummary
        title={t("mitigationPlanner.plan.cost", "Estimated cost")}
        icon={<EuroRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />}
        text={formatPlanCost(evaluation.costEstimate)}
      />
      <EstimateSummary
        title={t("mitigationPlanner.plan.setup", "Estimated setup")}
        icon={<ScheduleRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />}
        text={formatPlanSetup(evaluation.setupEstimate)}
      />
    </RABox>
  );
}

SelectedActions.propTypes = { evaluation: PropTypes.object.isRequired };

function StrategyAssessment({ evaluation, baselineRisk, label }) {
  switch (evaluation.strategy) {
    case "DATA":
      return <DataPlanAssessment evaluation={evaluation} baselineRisk={baselineRisk} />;
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

// Plain page flow (headings, tables, dividers) without an enclosing frame. Plan label, strategy,
// constraint summary and next step are already in the Candidate Mitigation Plans table.
export default function SelectedPlanAssessment({ plan, baselineRisk }) {
  const { evaluation, label } = plan;

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <SelectedActions evaluation={evaluation} />
      <Divider />
      <StrategyAssessment evaluation={evaluation} baselineRisk={baselineRisk} label={label} />
      <Divider />
      <ProjectConstraintChecks checks={evaluation.projectChecks || []} />
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
