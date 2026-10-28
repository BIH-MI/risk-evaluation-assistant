import Drawer from "@mui/material/Drawer";
import { styled } from "@mui/material/styles";

export default styled(Drawer)(({ theme, ownerState }) => {
  const { palette, boxShadows, transitions, functions } = theme;
  const { transparentSidenav, whiteSidenav, miniSidenav, darkMode, docked } =
    ownerState;

  const sidebarWidth = 250;
  const { transparent, gradients, white, background } = palette;
  const { xxl } = boxShadows;
  const { pxToRem, linearGradient } = functions;

  let backgroundValue = darkMode
    ? background.sidenav
    : linearGradient(gradients.dark.main, gradients.dark.state);

  // Over the page, a transparent sidenav would be unreadable.
  const isTransparent = transparentSidenav && docked;
  if (isTransparent) {
    backgroundValue = transparent.main;
  } else if (whiteSidenav) {
    backgroundValue = white.main;
  }

  // Open: docked beside the page or over it (miniSidenav={false}).
  const drawerOpenStyles = () => ({
    background: backgroundValue,
    width: sidebarWidth,
    left: "0",
    boxShadow: isTransparent ? "none" : xxl,
    marginBottom: isTransparent ? 0 : "inherit",
    transform: "translateX(0)",
    transition: transitions.create("transform", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.shorter,
    }),
  });

  // Closed: moved out of view at every width (miniSidenav={true}).
  const drawerCloseStyles = () => ({
    background: backgroundValue,
    width: sidebarWidth,
    transform: `translateX(${pxToRem(-320)})`,
    transition: transitions.create("transform", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.shorter,
    }),
  });

  return {
    "& .MuiDrawer-paper": {
      boxShadow: xxl,
      border: "none",

      ...(miniSidenav ? drawerCloseStyles() : drawerOpenStyles()),
    },
  };
});
