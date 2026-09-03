import PropTypes from "prop-types";

import RATypography from "components/display/RATypography";

export default function ReportSectionTitle({ children, className }) {
  return (
    <RATypography variant="h5" mb={1} textAlign="center" className={className}>
      <strong>{children}</strong>
    </RATypography>
  );
}

ReportSectionTitle.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

ReportSectionTitle.defaultProps = {
  className: "",
};
