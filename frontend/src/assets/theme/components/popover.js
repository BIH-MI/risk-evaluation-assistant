import pxToRem from "assets/theme/functions/pxToRem";

import borders from "assets/theme/base/borders";
import boxShadows from "assets/theme/base/boxShadows";
import colors from "assets/theme/base/colors";

const { transparent } = colors;
const { lg } = boxShadows;
const { borderRadius } = borders;

const popover = {
  styleOverrides: {
    paper: {
      backgroundColor: transparent.main,
      boxShadow: lg,
      padding: pxToRem(8),
      borderRadius: borderRadius.md,
    },
  },
};

export default popover;
