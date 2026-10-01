import PropTypes from "prop-types";
import { Chip } from "@mui/material";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import { formatPlanStatus, planStatusColor, planStatusHelp } from "../utils/mitigationPlannerFormatters";

// Backend plan status with its meaning in a tooltip; "Ready for review" is never "safe" or "approved".
export default function PlanStatusChip({ status }) {
  if (!status) return <span>—</span>;
  return (
    <RequirementHelpTooltip title={planStatusHelp(status)}>
      <Chip size="small" variant="outlined" color={planStatusColor(status)} label={formatPlanStatus(status)} />
    </RequirementHelpTooltip>
  );
}

PlanStatusChip.propTypes = { status: PropTypes.string };
PlanStatusChip.defaultProps = { status: null };
