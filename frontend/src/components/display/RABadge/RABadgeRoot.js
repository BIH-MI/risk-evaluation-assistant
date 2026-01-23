import MuiBadge from "@mui/material/Badge";
import { styled } from "@mui/material/styles";

export default styled(MuiBadge)(({ theme, ownerState }) => {
  const { color, variant, size, circular, border, container, hasContent } =
    ownerState;

  const { palette, typography, borders, functions } = theme;
  const { white, dark, gradients, badgeColors } = palette;
  const { size: fontSize, fontWeightBold } = typography;
  const { borderRadius, borderWidth } = borders;
  const { pxToRem, linearGradient } = functions;

  // padding map
  const paddings = {
    xs: "0.45em 0.775em",
    sm: "0.55em 0.9em",
    md: "0.65em 1em",
    lg: "0.85em 1.375em",
  };
  const fontSizeValue = size === "xs" ? fontSize.xxs : fontSize.xs;
  const borderValue = border ? `${borderWidth[3]} solid ${white.main}` : "none";
  const borderRadiusValue = circular ? borderRadius.section : borderRadius.md;

  // gradient vs contained palette
  const gradientBg = gradients[color]
    ? linearGradient(gradients[color].main, gradients[color].state)
    : "";
  const containedBg =
    badgeColors[color]?.background || badgeColors.info.background;
  const containedColor = badgeColors[color]?.text || badgeColors.info.text;

  return {
    // 1) root container for icon/avatar badges
    ...(container && {
      position: "relative",
      display: "inline-block",
    }),

    // 2) badge element
    "& .MuiBadge-badge": {
      // position absolute when overlaying
      ...(container && {
        position: "absolute",
        top: 0,
        right: 0,
        transform: "translate(50%, -50%)",
      }),

      // dot variant styles
      ...(variant === "dot" && {
        width: pxToRem(12),
        height: pxToRem(12),
        borderRadius: "50%",
        padding: 0,
        background: containedBg,
        color: containedColor,
      }),

      // standard numeric badge styles
      ...(variant === "standard" && {
        fontSize: fontSizeValue,
        textTransform: "uppercase",
        lineHeight: 1,
        background: gradientBg || containedBg,
        color: gradientBg ? dark.main : containedColor,
      }),

      // common border & radius
      border: borderValue,
      borderRadius: borderRadiusValue,

      // standalone numeric if not container
      ...(variant === "standard" &&
        !container && {
          position: "static",
          marginLeft: pxToRem(8),
          transform: "none",
          fontSize: pxToRem(9),
        }),
    },
  };
});
