import { forwardRef } from "react";

import PropTypes from "prop-types";

import RATypography from "components/display/RATypography";

import RAProgressRoot from "components/feedback/RAProgress/RAProgressRoot";

const RAProgress = forwardRef(
  ({ variant, color, value, label, ...rest }, ref) => (
    <>
      {label && (
        <RATypography variant="button" fontWeight="medium" color="text">
          {value}%
        </RATypography>
      )}
      <RAProgressRoot
        {...rest}
        ref={ref}
        variant="determinate"
        value={value}
        ownerState={{ color, value, variant }}
      />
    </>
  )
);

// Setting default values for the props of RAProgress
RAProgress.defaultProps = {
  variant: "contained",
  color: "info",
  value: 0,
  label: false,
};

// Typechecking props for the RAProgress
RAProgress.propTypes = {
  variant: PropTypes.oneOf(["contained", "gradient"]),
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
  value: PropTypes.number,
  label: PropTypes.bool,
};

export default RAProgress;
