import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import MitigationActionSelectionTable from "./MitigationActionSelectionTable";
import { ActionNameCell, EstimateCell, PriorityCell, RiskDriverCell } from "./ActionTableCells";
import { formatCostEstimate, formatSetupEstimate } from "../utils/mitigationPlannerFormatters";
import { dataProjectConsideration } from "../utils/mitigationPlanRows";

// Data transformations are proposals: no residual data-risk value is shown for them.
export default function DataActionTable({ rows, builder }) {
  const { t } = useTranslation();
  const columns = [
    { id: "priority", header: t("mitigationPlanner.actions.priority", "Priority"), render: (row) => <PriorityCell priority={row.priority} /> },
    { id: "driver", header: t("mitigationPlanner.actions.driverEvidence", "Risk driver / evidence"), render: (row) => <RiskDriverCell row={row} /> },
    {
      id: "action",
      header: t("mitigationPlanner.actions.transformation", "Proposed transformation"),
      render: (row) => <ActionNameCell name={row.actionName} kind={t("mitigationPlanner.actions.dataKind", "Proposed data transformation")} />,
    },
    { id: "project", header: t("mitigationPlanner.actions.projectConsideration", "Project consideration"), render: dataProjectConsideration },
    { id: "cost", header: t("mitigationPlanner.actions.cost", "Cost"), align: "center", render: (row) => <EstimateCell text={formatCostEstimate(row.estimate)} /> },
    { id: "setup", header: t("mitigationPlanner.actions.setup", "Setup time"), align: "center", render: (row) => <EstimateCell text={formatSetupEstimate(row.estimate)} /> },
  ];

  return (
    <MitigationActionSelectionTable
      label={t("mitigationPlanner.actions.dataTable", "Data transformation options")}
      columns={columns}
      rows={rows}
      selectedActionIds={builder.selectedActionIds}
      parameterChoices={builder.parameterChoices}
      onToggle={builder.toggleAction}
      onChoose={builder.chooseParameter}
      emptyText={t("mitigationPlanner.actions.dataEmpty", "No configured data transformations match the current data-side findings.")}
    />
  );
}

DataActionTable.propTypes = {
  rows: PropTypes.array.isRequired,
  builder: PropTypes.object.isRequired,
};
