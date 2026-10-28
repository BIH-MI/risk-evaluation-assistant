import { useEffect } from "react";

import { useLocation } from "react-router-dom";

import PropTypes from "prop-types";

import RABox from "components/layout/RABox";

import Footer from "components/display/Footer";
import { setLayout, useMaterialUIController } from "context";
import { useSidenavDockable } from "hooks/layout/useSidenavDockable";

function DashboardLayout({ children }) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav } = controller;
  const { pathname } = useLocation();
  // The sidebar takes room only while docked and open; over the page (or
  // closed) the page uses the full width.
  const sidenavDocked = useSidenavDockable() && !miniSidenav;

  useEffect(() => {
    setLayout(dispatch, "dataset");
  }, [dispatch, pathname]);

  return (
    <RABox
      sx={({ transitions, functions: { pxToRem } }) => ({
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh", // fill the viewport
        p: 3,
        marginLeft: sidenavDocked ? pxToRem(274) : 0,
        transition: transitions.create(["margin-left", "margin-right"], {
          easing: transitions.easing.easeInOut,
          duration: transitions.duration.standard,
        }),
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
