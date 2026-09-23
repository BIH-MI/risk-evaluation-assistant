import PropTypes from "prop-types";
import { Chip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import {
  formatProjectConstraintResult,
  projectConstraintColor,
} from "../utils/mitigationPlannerFormatters";

const ICONS = {
  PASS: <CheckIcon />,
  NEEDS_EVALUATION: <HelpOutlineIcon />,
  FAIL: <CloseIcon />,
};

// Pass / Needs evaluation / Fail for a single check or a plan-level summary.
export default function ProjectConstraintChip({ result }) {
  if (!result) return <span>—</span>;
  return (
    <Chip
      size="small"
      variant="outlined"
      icon={ICONS[result]}
      color={projectConstraintColor(result)}
      label={formatProjectConstraintResult(result)}
    />
  );
}

ProjectConstraintChip.propTypes = { result: PropTypes.string };
ProjectConstraintChip.defaultProps = { result: null };
