import { forwardRef } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// Custom styles for RAInput
import RAInputRoot from "components/input/RAInput/RAInputRoot";

const RAInput = forwardRef(({ error, success, disabled, ...rest }, ref) => (
  <RAInputRoot {...rest} ref={ref} ownerState={{ error, success, disabled }} />
));

// Setting default values for the props of RAInput
RAInput.defaultProps = {
  error: false,
  success: false,
  disabled: false,
};

// Typechecking props for the RAInput
RAInput.propTypes = {
  error: PropTypes.bool,
  success: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default RAInput;
