import { useEffect } from "react";

import { useLocation } from "react-router-dom";

import PropTypes from "prop-types";

import RABox from "components/layout/RABox";

import Footer from "components/display/Footer";
import { setLayout, useMaterialUIController } from "context";

function DashboardLayout({ children }) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav } = controller;
  const { pathname } = useLocation();

  useEffect(() => {
    setLayout(dispatch, "dataset");
  }, [dispatch, pathname]);

  return (
    <RABox
      sx={({ breakpoints, transitions, functions: { pxToRem } }) => ({
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh", // fill the viewport
        p: 3,

        [breakpoints.up("xl")]: {
          marginLeft: miniSidenav ? pxToRem(120) : pxToRem(274),
          transition: transitions.create(["margin-left", "margin-right"], {
            easing: transitions.easing.easeInOut,
            duration: transitions.duration.standard,
          }),
        },
      })}
    >
      {/* This wrapper grows to fill available space */}
      <RABox sx={{ flexGrow: 1 }}>{children}</RABox>

      {/* Footer will sit at bottom */}
      <Footer sx={{ marginTop: "auto" }} />
    </RABox>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
