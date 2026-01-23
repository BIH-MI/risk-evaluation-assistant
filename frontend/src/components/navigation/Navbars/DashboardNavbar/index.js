// src/components/navigation/Navbars/DashboardNavbar.jsx

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom"; // ← import useNavigate
import PropTypes from "prop-types";
import AppBar from "@mui/material/AppBar";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import RABox from "components/layout/RABox";
import Breadcrumbs from "components/navigation/Breadcrumbs";

import {
  navbar,
  navbarContainer,
  navbarIconButton,
  navbarMobileMenu,
  navbarRow,
} from "components/navigation/Navbars/DashboardNavbar/styles";

import {
  setMiniSidenav,
  setOpenConfigurator,
  setTransparentNavbar,
  useMaterialUIController,
} from "context";

import { useAuth } from "react-oidc-context";

function DashboardNavbar({ absolute, light, isMini }) {
  const auth = useAuth();

  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    transparentNavbar,
    fixedNavbar,
    openConfigurator,
    darkMode,
  } = controller;

  const route = useLocation().pathname.split("/").slice(1);

  useEffect(() => {
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }
    setTransparentNavbar(dispatch, false);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  const handleLogout = () => {
    auth.clearStaleState();
    auth.signoutRedirect();
  };


  const iconsStyle = ({
                        palette: { dark, white, text },
                        functions: { rgba },
                      }) => ({
    color: () => {
      let colorValue = light || darkMode ? white.main : dark.main;

      if (transparentNavbar && !light) {
        colorValue = darkMode ? rgba(text.main, 0.6) : text.main;
      }

      return colorValue;
    },
  });

  return (
      <AppBar
          position={absolute ? "absolute" : navbarType}
          color="inherit"
          sx={(theme) =>
              navbar(theme, { transparentNavbar, absolute, light, darkMode })
          }
      >
        <Toolbar sx={(theme) => navbarContainer(theme)}>
          <RABox
              color="inherit"
              mb={{ xs: 1, md: 0 }}
              sx={(theme) => navbarRow(theme, { isMini })}
          >
            <Breadcrumbs icon="home" route={route} light={light} />
          </RABox>
          {isMini ? null : (
              <RABox sx={(theme) => navbarRow(theme, { isMini })}>
                <RABox color={light ? "white" : "inherit"}>
                  <IconButton
                      size="small"
                      disableRipple
                      color="inherit"
                      sx={navbarMobileMenu}
                      onClick={handleMiniSidenav}
                  >
                    <Icon sx={iconsStyle} fontSize="medium">
                      {miniSidenav ? "menu_open" : "menu"}
                    </Icon>
                  </IconButton>

                  <IconButton
                      size="small"
                      disableRipple
                      color="inherit"
                      sx={navbarIconButton}
                      onClick={handleConfiguratorOpen}
                  >
                    <Icon sx={iconsStyle}>settings</Icon>
                  </IconButton>

                  <IconButton
                      size="small"
                      disableRipple
                      color="inherit"
                      sx={navbarIconButton}
                      onClick={handleLogout}
                  >
                    <Icon sx={iconsStyle}>logout</Icon>
                  </IconButton>
                </RABox>
              </RABox>
          )}
        </Toolbar>
      </AppBar>
  );
}

DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
