import PropTypes from "prop-types";
import { Chip } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import { compatibilityColor, formatCompatibility } from "../utils/mitigationPlannerFormatters";

const ICONS = {
  COMPATIBLE: <CheckIcon />,
  INCOMPATIBLE: <CloseIcon />,
  EVALUATION_REQUIRED: <HelpOutlineIcon />,
};

// Subtle outlined chip: status is conveyed by icon + text, not by page-wide color.
export default function CompatibilityChip({ compatibility, label }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      icon={ICONS[compatibility]}
      color={compatibilityColor(compatibility)}
      label={label || formatCompatibility(compatibility)}
    />
  );
}

CompatibilityChip.propTypes = {
  compatibility: PropTypes.string.isRequired,
  label: PropTypes.string,
};

CompatibilityChip.defaultProps = { label: null };
