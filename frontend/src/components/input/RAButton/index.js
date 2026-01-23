// components/input/RAButton/index.jsx

import { useMaterialUIController } from "context";
import PropTypes from "prop-types";
import { forwardRef } from "react";
import RAButtonRoot from "./RAButtonRoot";

const RAButton = forwardRef(
  (
    {
      color: colorProp, // rename to avoid shadowing
      variant,
      size,
      circular,
      iconOnly,
      children,
      ...rest
    },
    ref
  ) => {
    const [controller] = useMaterialUIController();
    const { darkMode, sidenavColor } = controller;

    // Prefer the explicitly passed colorProp, else use the context’s sidenavColor
    const color = colorProp || sidenavColor;

    return (
      <RAButtonRoot
        {...rest}
        ref={ref}
        color={color}
        variant={variant === "gradient" ? "contained" : variant}
        size={size}
        ownerState={{ color, variant, size, circular, iconOnly, darkMode }}
      >
        {children}
      </RAButtonRoot>
    );
  }
);

RAButton.defaultProps = {
  size: "medium",
  variant: "contained",
  color: undefined, // let context fill this in
  circular: false,
  iconOnly: false,
};

RAButton.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.oneOf(["text", "contained", "outlined", "gradient"]),
  // `color` may still be used to override the sidenavColor
  color: PropTypes.oneOf([
    "white",
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "light",
    "dark",
  ]),
  circular: PropTypes.bool,
  iconOnly: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default RAButton;
