import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Divider } from "@mui/material";

import RABox from "components/layout/RABox";
import ContextPlanAssessment from "./ContextPlanAssessment";
import ProjectConstraintChecks from "./ProjectConstraintChecks";
import SelectedSafeguardItem from "./SelectedSafeguardItem";
import { SectionLabel } from "./PlannerPrimitives";

function PlanActionList({ title, actions, appliedChanges, driversById }) {
  if (actions.length === 0) return null;
  return (
    <RABox>
      <SectionLabel>{title}</SectionLabel>
      <RABox component="ul" sx={{ my: 0, pl: 3, display: "flex", flexDirection: "column", gap: 1 }}>
        {actions.map((action) => (
          <SelectedSafeguardItem
            key={action.actionId}
            action={action}
            appliedChanges={appliedChanges}
            driversById={driversById}
          />
        ))}
      </RABox>
    </RABox>
  );
}

PlanActionList.propTypes = {
  title: PropTypes.string.isRequired,
  actions: PropTypes.array.isRequired,
  appliedChanges: PropTypes.array.isRequired,
  driversById: PropTypes.instanceOf(Map).isRequired,
};

// Cost and setup are compared in the Candidate Mitigation Plans table, not repeated here.
function SelectedActions({ evaluation, driversById }) {
  const { t } = useTranslation();
  const actions = evaluation.actions || [];
  const appliedChanges = evaluation.counterfactualContextResult?.appliedQuestionChanges || [];
  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <PlanActionList
        title={t("mitigationPlanner.plan.transformations", "Selected transformations")}
        actions={actions.filter((action) => action.actionType === "DATA_TRANSFORMATION")}
        appliedChanges={[]}
        driversById={driversById}
      />
      <PlanActionList
        title={t("mitigationPlanner.plan.safeguards", "Selected safeguards")}
        actions={actions.filter((action) => action.actionType === "CONTEXT_CONTROL")}
        appliedChanges={appliedChanges}
        driversById={driversById}
      />
    </RABox>
  );
}

SelectedActions.propTypes = {
  evaluation: PropTypes.object.isRequired,
  driversById: PropTypes.instanceOf(Map).isRequired,
};

// Detailed view of the plan selected in the Candidate Mitigation Plans table (generated or
// Custom): its actions and the Risk Drivers they address, the projected context where relevant and
// the Project checks. Cost and setup are compared in the table.
export default function SelectedPlanAssessment({ plan, driversById }) {
  const { evaluation, label } = plan;
  // Context and hybrid plans show the counterfactual context comparison. Data-only plans have none:
  // proposed transformations are not evaluated here (residual q requires the transformed data).
  const hasContextAssessment = evaluation.strategy === "CONTEXT" || evaluation.strategy === "HYBRID";

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      <SelectedActions evaluation={evaluation} driversById={driversById} />
      <Divider />
      {hasContextAssessment && (
        <>
          <ContextPlanAssessment evaluation={evaluation} planLabel={label} />
          <Divider />
        </>
      )}
      <ProjectConstraintChecks checks={evaluation.projectChecks || []} />
    </RABox>
  );
}

SelectedPlanAssessment.propTypes = {
  plan: PropTypes.shape({
    label: PropTypes.string,
    evaluation: PropTypes.object,
  }).isRequired,
  driversById: PropTypes.instanceOf(Map),
};

SelectedPlanAssessment.defaultProps = { driversById: new Map() };
