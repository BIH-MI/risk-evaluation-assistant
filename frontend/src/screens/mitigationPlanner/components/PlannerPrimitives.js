import { useState } from "react";
import PropTypes from "prop-types";
import { Collapse } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { NOT_AVAILABLE } from "../utils/mitigationPlannerFormatters";

// Small heading inside expanded details and parameter blocks.
export function SectionLabel({ children }) {
  return (
    <RATypography variant="body2" fontWeight="bold" display="block" mb={0.5}>
      {children}
    </RATypography>
  );
}

SectionLabel.propTypes = { children: PropTypes.node.isRequired };

/** Small text button that expands/collapses its children (matched evidence lists). */
export function ExpandableSection({ label, children }) {
  const [open, setOpen] = useState(false);

  return (
    <RABox>
      <RAButton
        variant="text"
        size="small"
        onClick={() => setOpen((current) => !current)}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        aria-expanded={open}
        sx={{ px: 0 }}
      >
        {label}
      </RAButton>
      <Collapse in={open} unmountOnExit>
        {children}
      </Collapse>
    </RABox>
  );
}

ExpandableSection.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

/** Cost/time cell text; unavailable estimates are visually subdued. */
export function EstimateText({ text }) {
  const unavailable = text === NOT_AVAILABLE;

  return (
    <RATypography variant="body2" sx={{ color: unavailable ? "text.secondary" : "text.primary" }}>
      {text}
    </RATypography>
  );
}

EstimateText.propTypes = { text: PropTypes.string.isRequired };
