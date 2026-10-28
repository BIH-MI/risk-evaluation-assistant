import PropTypes from "prop-types";
import React, { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import List from "@mui/material/List";
import RAButton from "../../input/RAButton";
import Link from "@mui/material/Link";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import SidenavCollapse from "components/navigation/Sidenav/SidenavCollapse";
import SidenavRoot from "components/navigation/Sidenav/SidenavRoot";
import sidenavLogoLabel from "components/navigation/Sidenav/styles/sidenav";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { isAdminUser } from "utils/auth";
import { useSidenavDockable } from "hooks/layout/useSidenavDockable";

import {
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
  useMaterialUIController,
} from "context";

function Sidenav({ color, brand, brandName, routes, ...rest }) {
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    transparentSidenav,
    whiteSidenav,
    darkMode,
    sidenavColor,
  } = controller;
  const location = useLocation();
  const collapseName = location.pathname
    .replace(/\/\d+/g, "")
    .replace(/^\/|\/$/g, "");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  let textColor = "white";

  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "dark";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);
  // Docked beside the page, or hidden and opened over it (laptops and pages
  // that need the full width). `miniSidenav` means closed.
  const dockable = useSidenavDockable();

  // Default per mode: open when docked, closed otherwise. Applied only when
  // the mode changes, so a researcher's own toggle is kept while navigating.
  useEffect(() => {
    setMiniSidenav(dispatch, !dockable);
  }, [dispatch, dockable]);

  // Opened over the page, the sidebar closes after navigating.
  useEffect(() => {
    if (!dockable) setMiniSidenav(dispatch, true);
  }, [dispatch, dockable, location.pathname]);

  useEffect(() => {
    // Transparent and white sidenav styles are not used on small screens.
    function handleMiniSidenav() {
      setTransparentSidenav(
        dispatch,
        window.innerWidth < 1200 ? false : transparentSidenav
      );
      setWhiteSidenav(
        dispatch,
        window.innerWidth < 1200 ? false : whiteSidenav
      );
    }

    /**
     The event listener that's calling the handleMiniSidenav function when resizing the window.
     */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location, transparentSidenav, whiteSidenav]);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes.map(
    ({ type, name, icon, title, noCollapse, key, href, route, adminOnly }) => {
      let returnValue;

      if (adminOnly && !isAdmin) {
        return null;
      }

      if (type === "collapse") {
        returnValue = href ? (
          <Link
            href={href}
            key={key}
            target="_blank"
            rel="noreferrer"
            sx={{ textDecoration: "none" }}
          >
            <SidenavCollapse
              name={name ? t(name) : ""}
              icon={icon}
              active={key === collapseName}
              noCollapse={noCollapse}
            />
          </Link>
        ) : (
          <NavLink key={key} to={route}>
            <SidenavCollapse
              name={name ? t(name) : ""}
              icon={icon}
              active={key === collapseName}
            />{" "}
          </NavLink>
        );
      } else if (type === "title") {
        returnValue = (
          <RATypography
            key={key}
            color={textColor}
            display="block"
            variant="caption"
            fontWeight="bold"
            textTransform="uppercase"
            pl={3}
            mt={2}
            mb={1}
            ml={1}
          >
            {title ? t(title) : ""}{" "}
            {/* Optional: Translate titles if you add them later */}
          </RATypography>
        );
      } else if (type === "divider") {
        returnValue = (
          <Divider
            key={key}
            light={
              (!darkMode && !whiteSidenav && !transparentSidenav) ||
              (darkMode && !transparentSidenav && whiteSidenav)
            }
          />
        );
      }

      return returnValue;
    }
  );

  return (
    <SidenavRoot
      {...rest}
      // Over the page it is a temporary drawer: a backdrop, Escape or a
      // click outside closes it.
      variant={dockable ? "permanent" : "temporary"}
      open={!miniSidenav}
      onClose={closeSidenav}
      ownerState={{
        transparentSidenav,
        whiteSidenav,
        miniSidenav,
        darkMode,
        docked: dockable,
      }}
    >
      <RABox pt={3} pb={1} px={4} textAlign="center">
        <RABox
          display={dockable ? "none" : "block"}
          position="absolute"
          top={0}
          right={0}
          p={1.625}
          onClick={closeSidenav}
          sx={{ cursor: "pointer" }}
        >
          <RATypography variant="h6" color="secondary">
            <Icon sx={{ fontWeight: "bold" }}>close</Icon>
          </RATypography>
        </RABox>
        <RABox component={NavLink} to="/" display="flex" alignItems="center">
          {brand && (
            <RABox component="img" src={brand} alt="Brand" width="2rem" />
          )}
          <RABox
            width={!brandName && "100%"}
            sx={(theme) => sidenavLogoLabel(theme, { miniSidenav })}
          >
            <RATypography
              component="h6"
              variant="button"
              fontWeight="medium"
              color={textColor}
            >
              {brandName}
            </RATypography>
          </RABox>
        </RABox>
      </RABox>
      <Divider
        light={
          (!darkMode && !whiteSidenav && !transparentSidenav) ||
          (darkMode && !transparentSidenav && whiteSidenav)
        }
      />
      <List>{renderRoutes}</List>
      <RABox p={2} mt="auto">
        <RAButton
          variant="gradient"
          color={sidenavColor}
          fullWidth
          onClick={() => navigate("/documentation")}
        >
          {t("navigation.documentation")}
        </RAButton>
      </RABox>
    </SidenavRoot>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "dark",
  ]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
