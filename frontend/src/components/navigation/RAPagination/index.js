import { createContext, forwardRef, useContext, useMemo } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

import RABox from "components/layout/RABox";

// Custom styles for RAPagination
import RAPaginationItemRoot from "components/navigation/RAPagination/RAPaginationItemRoot";

// The Pagination main context
const Context = createContext();

const RAPagination = forwardRef(
  ({ item, variant, color, size, active, children, ...rest }, ref) => {
    const context = useContext(Context);
    const paginationSize = context ? context.size : null;

    const value = useMemo(
      () => ({ variant, color, size }),
      [variant, color, size]
    );

    return (
      <Context.Provider value={value}>
        {item ? (
          <RAPaginationItemRoot
            {...rest}
            ref={ref}
            variant={active ? context.variant : "outlined"}
            color={active ? context.color : "secondary"}
            iconOnly
            circular
            ownerState={{ variant, active, paginationSize }}
          >
            {children}
          </RAPaginationItemRoot>
        ) : (
          <RABox
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            sx={{ listStyle: "none" }}
          >
            {children}
          </RABox>
        )}
      </Context.Provider>
    );
  }
);

// Setting default values for the props of RAPagination
RAPagination.defaultProps = {
  item: false,
  variant: "gradient",
  color: "info",
  size: "medium",
  active: false,
};

// Typechecking props for the RAPagination
RAPagination.propTypes = {
  item: PropTypes.bool,
  variant: PropTypes.oneOf(["gradient", "contained"]),
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
  size: PropTypes.oneOf(["small", "medium", "large"]),
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default RAPagination;
