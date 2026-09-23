import PropTypes from "prop-types";
import { Chip } from "@mui/material";

import RATypography from "components/display/RATypography";
import { EstimateText } from "./PlannerPrimitives";
import { formatRiskDriverPriority } from "../utils/mitigationPlannerFormatters";
import { riskDriverSummary } from "../utils/mitigationPlanRows";

export function PriorityCell({ priority }) {
  if (!priority) return "—";
  const color = priority === "CRITICAL" ? "error" : priority === "HIGH" ? "warning" : "default";
  return <Chip size="small" variant="outlined" color={color} label={formatRiskDriverPriority(priority)} />;
}

PriorityCell.propTypes = { priority: PropTypes.string };
PriorityCell.defaultProps = { priority: null };

export function RiskDriverCell({ row }) {
  return <RATypography variant="body2">{riskDriverSummary(row)}</RATypography>;
}

RiskDriverCell.propTypes = { row: PropTypes.object.isRequired };

export function ActionNameCell({ name, kind }) {
  return (
    <>
      <RATypography variant="body2" fontWeight="bold">
        {name}
      </RATypography>
      <RATypography variant="caption" display="block" sx={{ color: "text.secondary" }}>
        {kind}
      </RATypography>
    </>
  );
}

ActionNameCell.propTypes = { name: PropTypes.string.isRequired, kind: PropTypes.string.isRequired };

export function EstimateCell({ text }) {
  return <EstimateText text={text} />;
}

EstimateCell.propTypes = { text: PropTypes.string.isRequired };
