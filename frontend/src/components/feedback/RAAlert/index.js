import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Fade from "@mui/material/Fade";
import RABox from "components/layout/RABox";
import RAAlertCloseIcon from "components/feedback/RAAlert/RAAlertCloseIcon";
import RAAlertRoot from "components/feedback/RAAlert/RAAlertRoot";

function RAAlert({ color, dismissible, children, ...rest }) {
  const [alertStatus, setAlertStatus] = useState("mount");
  const handleAlertStatus = () => setAlertStatus("fadeOut");

  // Automatically trigger fade-out after 5 seconds
  useEffect(() => {
    if (alertStatus === "mount") {
      const timer = setTimeout(handleAlertStatus, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertStatus]);

  // The base template for the alert
  const alertTemplate = (mount = true) => (
      <Fade in={mount} timeout={800}>
        <RAAlertRoot ownerState={{ color }} {...rest}>
          <RABox display="flex" alignItems="center" color="white">
            {children}
          </RABox>
          {dismissible ? (
              <RAAlertCloseIcon onClick={mount ? handleAlertStatus : null}>
                &times;
              </RAAlertCloseIcon>
          ) : null}
        </RAAlertRoot>
      </Fade>
  );

  switch (true) {
    case alertStatus === "mount":
      return alertTemplate();
    case alertStatus === "fadeOut":
      setTimeout(() => setAlertStatus("unmount"), 400);
      return alertTemplate(false);
    default:
      return null;
  }
}

RAAlert.defaultProps = {
  color: "info",
  dismissible: false,
};

RAAlert.propTypes = {
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
  dismissible: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default RAAlert;
