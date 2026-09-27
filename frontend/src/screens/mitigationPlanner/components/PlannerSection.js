import PropTypes from "prop-types";
import { Paper } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ReportSectionTitle from "screens/dataSharingReport/components/shared/ReportSectionTitle";

// Report-style section: centered title, optional description and a themed Paper body (optional).
export default function PlannerSection({ id, title, description, framed, children }) {
  return (
    <RABox id={id} component="section" sx={{ scrollMarginTop: 96 }}>
      <ReportSectionTitle>{title}</ReportSectionTitle>
      {description && (
        <RATypography variant="body2" textAlign="center" mb={2}>
          {description}
        </RATypography>
      )}
      {framed ? (
        <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
          {children}
        </Paper>
      ) : (
        <RABox sx={{ px: { xs: 0, md: 1 } }}>{children}</RABox>
      )}
    </RABox>
  );
}

PlannerSection.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  // Sections that mostly hold tables read better without a surrounding frame.
  framed: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

PlannerSection.defaultProps = {
  description: null,
  framed: true,
};
