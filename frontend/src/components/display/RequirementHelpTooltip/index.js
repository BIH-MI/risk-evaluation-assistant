import React from "react";
import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";

export const requirementHelpTooltipComponentsProps = {
  tooltip: {
    sx: (theme) => ({
      bgcolor: theme.palette.grey[900],
      color: theme.palette.common.white,
      fontSize: "0.8rem",
      lineHeight: 1.4,
      maxWidth: 320,
      px: 1.5,
      py: 1,
      boxShadow: theme.shadows[4],
      whiteSpace: "pre-line",
      "& .MuiTypography-root": {
        color: "inherit",
      },
    }),
  },
  arrow: {
    sx: (theme) => ({
      color: theme.palette.grey[900],
    }),
  },
};

export default function RequirementHelpTooltip({ title, children, ...rest }) {
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
};
