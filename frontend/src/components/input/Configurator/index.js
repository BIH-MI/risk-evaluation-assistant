import { useCallback, useEffect, useState } from "react";

// MUI Components
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";

// Custom components
import RATypography from "components/display/RATypography";
import ConfiguratorRoot from "components/input/Configurator/ConfiguratorRoot";
import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";

// Context
import {
  setDarkMode,
  setFixedNavbar,
  setOpenConfigurator,
  setSidenavColor,
  setTransparentSidenav,
  setWhiteSidenav,
  useMaterialUIController,
} from "context";

// Available sidebar colors
const SIDENAV_COLORS = [
  "primary",
  "dark",
  "info",
  "success",
  "warning",
  "error",
];

// Button style generators
const useButtonStyles = ({ darkMode }) => ({
  normal: ({
    functions: { pxToRem },
    palette: { white, dark, background },
    borders: { borderWidth },
  }) => ({
    height: pxToRem(39),
    background: darkMode ? background.sidenav : white.main,
    color: darkMode ? white.main : dark.main,
    border: `${borderWidth[1]} solid ${darkMode ? white.main : dark.main}`,
    "&:hover, &:focus": {
      background: darkMode ? background.sidenav : white.main,
      color: darkMode ? white.main : dark.main,
      border: `${borderWidth[1]} solid ${darkMode ? white.main : dark.main}`,
    },
  }),
  active: ({
    functions: { pxToRem, linearGradient },
    palette: { white, gradients, background },
  }) => ({
    height: pxToRem(39),
    background: darkMode
      ? white.main
      : linearGradient(gradients.dark.main, gradients.dark.state),
    color: darkMode ? background.sidenav : white.main,
    "&:hover, &:focus": {
      background: darkMode
        ? white.main
        : linearGradient(gradients.dark.main, gradients.dark.state),
      color: darkMode ? background.sidenav : white.main,
    },
  }),
});

function Configurator() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    openConfigurator,
    fixedNavbar,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
  } = controller;

  const [disabled, setDisabled] = useState(false);
  const styles = useButtonStyles({ darkMode });

  // Toggle disabled state based on screen width
  const handleResize = useCallback(() => {
    setDisabled(window.innerWidth <= 1200);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Handlers
  const close = () => setOpenConfigurator(dispatch, false);

  const applyDarkSidenav = () => {
    setWhiteSidenav(dispatch, false);
    setTransparentSidenav(dispatch, false);
  };
  const applyWhiteSidenav = () => {
    setWhiteSidenav(dispatch, true);
    setTransparentSidenav(dispatch, false);
  };
  const toggleFixedNavbar = () => setFixedNavbar(dispatch, !fixedNavbar);
  const toggleDarkMode = () => setDarkMode(dispatch, !darkMode);

  return (
    <ConfiguratorRoot variant="permanent" ownerState={{ openConfigurator }}>
      {/* Header */}
      <RABox
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={3}
        py={2}
      >
        <RATypography variant="h5">Dashboard Settings</RATypography>
        <Icon
          onClick={close}
          sx={({ typography: { size }, palette: { dark, white } }) => ({
            fontSize: `${size.lg} !important`,
            color: darkMode ? white.main : dark.main,
            cursor: "pointer",
          })}
        >
          close
        </Icon>
      </RABox>

      <Divider />

      {/* Sidebar Colors */}
      <RABox px={3} py={2}>
        <RATypography variant="h6">Sidebar Color</RATypography>
        <Grid container spacing={1} mt={1}>
          {SIDENAV_COLORS.map((color) => (
            <Grid item key={color}>
              <IconButton
                onClick={() => setSidenavColor(dispatch, color)}
                disabled={disabled}
                sx={({
                  palette: { white, dark, background },
                  borders,
                  transitions,
                }) => ({
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: `${borders.borderWidth[1]} solid ${
                    darkMode ? background.sidenav : white.main
                  }`,
                  transition: transitions.create("border-color", {
                    easing: transitions.easing.sharp,
                    duration: transitions.duration.shorter,
                  }),
                  backgroundImage: ({
                    functions: { linearGradient },
                    palette: { gradients },
                  }) =>
                    linearGradient(
                      gradients[color].main,
                      gradients[color].state
                    ),
                  borderColor:
                    sidenavColor === color
                      ? darkMode
                        ? white.main
                        : dark.main
                      : undefined,
                })}
              ></IconButton>
            </Grid>
          ))}
        </Grid>
      </RABox>

      <Divider />

      {/* Sidebar Types */}
      <RABox px={3} py={2}>
        <RATypography variant="h6">Sidebar Style</RATypography>
        <RABox display="flex" gap={2} mt={1}>
          <RAButton
            onClick={applyDarkSidenav}
            disabled={disabled}
            fullWidth
            sx={
              !transparentSidenav && !whiteSidenav
                ? styles.active
                : styles.normal
            }
          >
            Dark
          </RAButton>
          <RAButton
            onClick={applyWhiteSidenav}
            disabled={disabled}
            fullWidth
            sx={
              whiteSidenav && !transparentSidenav
                ? styles.active
                : styles.normal
            }
          >
            White
          </RAButton>
        </RABox>
      </RABox>

      <Divider />

      {/* Navbar & Theme Toggles */}
      <RABox px={3} py={2} display="flex" flexDirection="column" gap={2}>
        <RABox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <RATypography variant="h6">Fixed Navbar</RATypography>
          <Switch checked={fixedNavbar} onChange={toggleFixedNavbar} />
        </RABox>

        <RABox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <RATypography variant="h6">Light / Dark Mode</RATypography>
          <Switch checked={darkMode} onChange={toggleDarkMode} />
        </RABox>
      </RABox>

      <Divider />
    </ConfiguratorRoot>
  );
}

export default Configurator;
