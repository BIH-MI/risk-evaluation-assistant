import React from "react";
import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";

// The theme tooltip is a small, centred, 70%-opacity dark label. Help tooltips carry longer rich
// content (question text, current and projected answers), so they use the theme's paper surface
// and primary text colour, which are readable in both light and dark mode. Nested boxes and
// typography inherit that colour, so component defaults cannot override it.
export const requirementHelpTooltipComponentsProps = {
  tooltip: {
    sx: (theme) => ({
      bgcolor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      border: `1px solid ${theme.palette.divider}`,
      opacity: 1,
      textAlign: "left",
      fontSize: "0.8rem",
      lineHeight: 1.45,
      maxWidth: 480,
      px: 2,
      py: 1.5,
      boxShadow: theme.shadows[6],
      whiteSpace: "pre-line",
      overflowWrap: "anywhere",
      // RABox and RATypography default to the "dark" palette colour (dark blue in both themes);
      // inside a help tooltip everything inherits the tooltip's text colour instead.
      "& .MuiBox-root, & .MuiTypography-root, & .MuiTypography-root *": {
        color: "inherit",
      },
    }),
  },
  arrow: {
    sx: (theme) => ({
      color: theme.palette.background.paper,
      "&::before": { border: `1px solid ${theme.palette.divider}` },
    }),
  },
  popper: {
    // Rendered in a portal so table containers never clip it; Popper flips and shifts it
    // to stay inside the viewport.
    modifiers: [
      { name: "flip", options: { fallbackPlacements: ["bottom-start", "top-end", "bottom-end"] } },
      { name: "preventOverflow", options: { padding: 8, altAxis: true } },
    ],
  },
};

export default function RequirementHelpTooltip({ title, children, placement, ...rest }) {
  const tooltipTitle =
    typeof title === "string" ? (
      <span style={{ color: "inherit", whiteSpace: "pre-line" }}>
        {title}
      </span>
    ) : (
      title
    );

  return (
    <Tooltip
      {...rest}
      title={tooltipTitle}
      placement={placement}
      arrow
      componentsProps={requirementHelpTooltipComponentsProps}
    >
      {children}
    </Tooltip>
  );
}

RequirementHelpTooltip.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.element.isRequired,
  placement: PropTypes.string,
};

RequirementHelpTooltip.defaultProps = {
  placement: "top-start",
};
