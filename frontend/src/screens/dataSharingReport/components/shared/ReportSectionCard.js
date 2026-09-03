import PropTypes from "prop-types";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export default function ReportSectionCard({ title, children, sx }) {
  return (
    <RABox
      p={2}
      sx={{
        borderRadius: 2,
        border: ({ palette }) => `1px solid ${palette.light.main}`,
        bgcolor: ({ palette }) =>
          palette.background.card || palette.background.default,
        ...sx,
      }}
    >
      {title && (
        <RATypography variant="h6" textAlign="left" mb={1}>
          <strong>{title}</strong>
        </RATypography>
      )}
      {children}
    </RABox>
  );
}

ReportSectionCard.propTypes = {
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};

ReportSectionCard.defaultProps = {
  title: null,
  sx: {},
};
