import React from "react";
import PropTypes from "prop-types";
import { LinearProgress } from "@mui/material";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

/**
 * Linear progress bar with a text label. `value` null means indeterminate.
 * REA's theme pins LinearProgress bars with `transform` (see
 * assets/theme/components/linearProgress.js), so a determinate bar is sized
 * by width, as in RAProgress.
 */
export function LabeledLinearProgress({ label, value, color, ariaLabel }) {
  const determinate = typeof value === "number";
  const clamped = determinate ? Math.min(Math.max(value, 0), 100) : null;
  return (
    <RABox
      display="flex"
      flexDirection="column"
      gap={0.5}
      sx={{ width: "100%" }}
    >
      <RATypography
        variant="caption"
        color="text"
        role="status"
        aria-live="polite"
      >
        {label}
      </RATypography>
      <LinearProgress
        variant={determinate ? "determinate" : "indeterminate"}
        value={determinate ? clamped : undefined}
        color={color}
        aria-label={ariaLabel || label}
        aria-valuetext={label}
        sx={
          determinate
            ? { "& .MuiLinearProgress-bar": { width: `${clamped}%` } }
            : undefined
        }
      />
    </RABox>
  );
}

LabeledLinearProgress.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
  ]),
  ariaLabel: PropTypes.string,
};

LabeledLinearProgress.defaultProps = {
  value: null,
  color: "info",
  ariaLabel: "",
};

