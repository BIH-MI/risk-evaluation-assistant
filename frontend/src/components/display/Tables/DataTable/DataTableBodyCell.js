import PropTypes from "prop-types";

import RABox from "components/layout/RABox";

function DataTableBodyCell({ noBorder, align, children }) {
  return (
    <RABox
      component="td"
      textAlign={align}
      py={1.5}
      px={3}
      sx={({
        palette: { light },
        typography: { size },
        borders: { borderWidth },
      }) => ({
        fontSize: size.sm,
        borderBottom: noBorder
          ? "none"
          : `${borderWidth[1]} solid ${light.main}`,
      })}
    >
        <RABox
            display="block"
            width="100%"
            color="text"
            sx={{ verticalAlign: "middle" }}
        >
        {children}
      </RABox>
    </RABox>
  );
}

DataTableBodyCell.defaultProps = {
  noBorder: false,
  align: "left",
};

DataTableBodyCell.propTypes = {
  children: PropTypes.node.isRequired,
  noBorder: PropTypes.bool,
  align: PropTypes.oneOf(["left", "right", "center"]),
};

export default DataTableBodyCell;
