import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import MitigationActionSelectionTable from "./MitigationActionSelectionTable";
import ProjectConstraintChip from "./ProjectConstraintChip";
import { ActionNameCell, EstimateCell, PriorityCell, RiskDriverCell } from "./ActionTableCells";
import { formatCostEstimate, formatSetupEstimate } from "../utils/mitigationPlannerFormatters";
import { contextAnswerTransition } from "../utils/mitigationPlanRows";

// Projected answers are catalogue mappings used only for an in-memory what-if evaluation.
export default function ContextActionTable({ rows, builder }) {
  const { t } = useTranslation();
  const columns = [
    { id: "priority", header: t("mitigationPlanner.actions.priority", "Priority"), render: (row) => <PriorityCell priority={row.priority} /> },
    { id: "driver", header: t("mitigationPlanner.actions.driver", "Risk driver"), render: (row) => <RiskDriverCell row={row} /> },
    { id: "current", header: t("mitigationPlanner.actions.currentAnswer", "Current answer"), render: (row) => contextAnswerTransition(row).current },
    {
      id: "action",
      header: t("mitigationPlanner.actions.mitigation", "Proposed mitigation"),
      render: (row) => <ActionNameCell name={row.actionName} kind={t("mitigationPlanner.actions.contextKind", "Context control")} />,
    },
    { id: "projected", header: t("mitigationPlanner.actions.projectedAnswer", "Projected verified answer"), render: (row) => contextAnswerTransition(row).projected },
    { id: "cost", header: t("mitigationPlanner.actions.cost", "Cost"), align: "center", render: (row) => <EstimateCell text={formatCostEstimate(row.estimate)} /> },
    { id: "setup", header: t("mitigationPlanner.actions.setup", "Setup time"), align: "center", render: (row) => <EstimateCell text={formatSetupEstimate(row.estimate)} /> },
    {
      id: "feasibility",
      header: t("mitigationPlanner.actions.feasibility", "Project feasibility"),
      render: (row) =>
        row.projectFeasibility ? (
          <ProjectConstraintChip result={row.projectFeasibility.result} />
        ) : (
          t("mitigationPlanner.actions.noOperationalConstraint", "No budget or setup limit")
        ),
    },
  ];

  return (
    <MitigationActionSelectionTable
      label={t("mitigationPlanner.actions.contextTable", "Context control options")}
      columns={columns}
      rows={rows}
      selectedActionIds={builder.selectedActionIds}
      parameterChoices={builder.parameterChoices}
      onToggle={builder.toggleAction}
      onChoose={builder.chooseParameter}
      emptyText={t("mitigationPlanner.actions.contextEmpty", "No configured context controls match the current context-side findings.")}
    />
  );
}

ContextActionTable.propTypes = {
  rows: PropTypes.array.isRequired,
  builder: PropTypes.object.isRequired,
};
