import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export default function ReportSectionLoading({ label }) {
  return (
    <RABox
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={1}
      py={3}
    >
      <CircularProgress />
      {label && (
        <RATypography variant="caption" color="text">
          {label}
        </RATypography>
      )}
    </RABox>
  );
}

ReportSectionLoading.propTypes = {
  label: PropTypes.string,
};

ReportSectionLoading.defaultProps = {
  label: "",
};
