import PropTypes from "prop-types";

import Divider from "@mui/material/Divider";
import Fade from "@mui/material/Fade";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";

import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

import RASnackbarIconRoot from "components/feedback/RASnackbar/RASnackbarIconRoot";

import { useMaterialUIController } from "context";

function RASnackbar({
  color,
  icon,
  title,
  dateTime,
  content,
  close,
  bgWhite,
  ...rest
}) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  let titleColor;
  let dateTimeColor;
  let dividerColor;

  if (bgWhite) {
    titleColor = color;
    dateTimeColor = "dark";
    dividerColor = false;
  } else if (color === "light") {
    titleColor = darkMode ? "inherit" : "dark";
    dateTimeColor = darkMode ? "inherit" : "text";
    dividerColor = false;
  } else {
    titleColor = "white";
    dateTimeColor = "white";
    dividerColor = true;
  }

  return (
    <Snackbar
      TransitionComponent={Fade}
      autoHideDuration={5000}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      {...rest}
      action={
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={close}
        >
          <Icon fontSize="small">close</Icon>
        </IconButton>
      }
    >
      <RABox
        variant={bgWhite ? "contained" : "gradient"}
        bgColor={bgWhite ? "white" : color}
        minWidth="21.875rem"
        maxWidth="100%"
        shadow="md"
        borderRadius="md"
        p={1}
        sx={{
          backgroundColor: ({ palette }) =>
            darkMode
              ? palette.background.card
              : palette[color] || palette.white.main,
        }}
      >
        <RABox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          color="dark"
          p={1.5}
        >
          <RABox display="flex" alignItems="center" lineHeight={0}>
            <RASnackbarIconRoot
              fontSize="small"
              ownerState={{ color, bgWhite }}
            >
              {icon}
            </RASnackbarIconRoot>
            <RATypography
              variant="button"
              fontWeight="medium"
              color={titleColor}
              textGradient={bgWhite}
            >
              {title}
            </RATypography>
          </RABox>
          <RABox display="flex" alignItems="center" lineHeight={0}>
            <RATypography variant="caption" color={dateTimeColor}>
              {dateTime}
            </RATypography>
            <Icon
              sx={{
                color: ({ palette: { dark, white } }) =>
                  (bgWhite && !darkMode) || color === "light"
                    ? dark.main
                    : white.main,
                fontWeight: ({ typography: { fontWeightBold } }) =>
                  fontWeightBold,
                cursor: "pointer",
                marginLeft: 2,
                transform: "translateY(-1px)",
              }}
              onClick={close}
            >
              close
            </Icon>
          </RABox>
        </RABox>
        <Divider sx={{ margin: 0 }} light={dividerColor} />
        <RABox
          p={1.5}
          sx={{
            fontSize: ({ typography: { size } }) => size.sm,
            color: ({ palette: { white, text } }) => {
              let colorValue =
                bgWhite || color === "light" ? text.main : white.main;

              if (darkMode) {
                colorValue = color === "light" ? "inherit" : white.main;
              }

              return colorValue;
            },
          }}
        >
          {content}
        </RABox>
      </RABox>
    </Snackbar>
  );
}

RASnackbar.defaultProps = {
  bgWhite: false,
  color: "info",
};

RASnackbar.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "dark",
    "light",
  ]),
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  dateTime: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
  close: PropTypes.func.isRequired,
  bgWhite: PropTypes.bool,
};

export default RASnackbar;
