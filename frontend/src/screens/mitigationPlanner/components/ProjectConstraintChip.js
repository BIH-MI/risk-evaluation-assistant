import PropTypes from "prop-types";
import { Chip } from "@mui/material";

import { formatProjectConstraintResult, projectConstraintColor } from "../utils/mitigationPlannerFormatters";

// Pass / Needs evaluation / Fail for a single check or a plan-level summary.
export default function ProjectConstraintChip({ result }) {
  if (!result) return <span>—</span>;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={projectConstraintColor(result)}
      label={formatProjectConstraintResult(result)}
    />
  );
}

ProjectConstraintChip.propTypes = { result: PropTypes.string };
ProjectConstraintChip.defaultProps = { result: null };
