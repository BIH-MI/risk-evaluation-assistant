import PropTypes from "prop-types";
import { Chip } from "@mui/material";

import { formatRequirementCheckResult, requirementCheckColor } from "../utils/mitigationPlannerFormatters";

// Pass / Needs evaluation / Fail for a single check or a plan-level summary.
export default function ActivityRequirementChip({ result }) {
  if (!result) return <span>—</span>;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={requirementCheckColor(result)}
      label={formatRequirementCheckResult(result)}
    />
  );
}

ActivityRequirementChip.propTypes = { result: PropTypes.string };
ActivityRequirementChip.defaultProps = { result: null };
