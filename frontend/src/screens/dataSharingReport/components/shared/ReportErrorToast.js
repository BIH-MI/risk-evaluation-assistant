import PropTypes from "prop-types";

import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export default function ReportErrorToast({ message, onClose }) {
  if (!message) return null;

  return (
    <RABox
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 360,
        zIndex: 2000,
      }}
    >
      <RAAlert color="error" dismissible onClose={onClose}>
        <RATypography variant="body2" color="white">
          {message}
        </RATypography>
      </RAAlert>
    </RABox>
  );
}

ReportErrorToast.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

ReportErrorToast.defaultProps = {
  message: "",
};
