import { forwardRef } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

import RABadgeRoot from "components/display/RABadge/RABadgeRoot";

const RABadge = forwardRef(
  (
    {
      color,
      variant,
      size,
      circular,
      indicator,
      border,
      container,
      badgeContent,
      children,
      ...rest
    },
    ref
  ) => {
    // Map `indicator` boolean to MUI's dot variant and ensure badgeContent exists for dot
    const muiVariant = indicator ? "dot" : variant;
    const hasContent = badgeContent != null || indicator;

    return (
      <RABadgeRoot
        {...rest}
        ref={ref}
        color={color}
        variant={muiVariant}
        badgeContent={badgeContent}
        ownerState={{
          color,
          variant: muiVariant,
          size,
          circular,
          border,
          container,
          hasContent,
        }}
      >
        {children}
      </RABadgeRoot>
    );
  }
);

RABadge.defaultProps = {
  color: "info",
  variant: "standard",
  size: "sm",
  circular: false,
  indicator: false,
  border: false,
  container: false,
  badgeContent: null,
};

RABadge.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "light",
    "dark",
  ]),
  variant: PropTypes.oneOf(["standard", "dot"]),
  size: PropTypes.oneOf(["xs", "sm", "md", "lg"]),
  circular: PropTypes.bool,
  indicator: PropTypes.bool,
  border: PropTypes.bool,
  container: PropTypes.bool,
  badgeContent: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default RABadge;
