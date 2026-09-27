import colors from "assets/theme-dark/base/colors";

import pxToRem from "assets/theme-dark/functions/pxToRem";

const { text, transparent } = colors;

const select = {
  styleOverrides: {
    select: {
      display: "grid",
      alignItems: "center",
      color: text.primary || text.main,
      padding: `${pxToRem(12)} ${pxToRem(12)} !important`,
      "&.Mui-disabled": {
        color: text.disabled,
        WebkitTextFillColor: text.disabled,
      },
      "& .Mui-selected": {
        backgroundColor: transparent.main,
      },
    },

    selectMenu: {
      background: "none",
      height: "none",
      minHeight: "none",
      overflow: "unset",
    },

    icon: {
      display: "none",
    },
  },
};

export default select;
