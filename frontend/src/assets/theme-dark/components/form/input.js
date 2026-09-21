import borders from "assets/theme-dark/base/borders";
import colors from "assets/theme-dark/base/colors";
import typography from "assets/theme-dark/base/typography";

import rgba from "assets/theme-dark/functions/rgba";

const { info, inputBorderColor, text } = colors;
const { size } = typography;
const { borderWidth } = borders;

const input = {
  styleOverrides: {
    root: {
      fontSize: size.sm,
      color: text.primary || text.main,

      "&.Mui-disabled": {
        color: text.disabled,
      },

      "&:hover:not(.Mui-disabled):before": {
        borderBottom: `${borderWidth[1]} solid ${rgba(inputBorderColor, 0.6)}`,
      },

      "&:before": {
        borderColor: rgba(inputBorderColor, 0.6),
      },

      "&:after": {
        borderColor: info.main,
      },

      input: {
        color: "inherit",

        "&.Mui-disabled": {
          color: text.disabled,
          WebkitTextFillColor: text.disabled,
        },

        "&::-webkit-input-placeholder": {
          color: text.secondary,
          opacity: 0.72,
        },
        "&::placeholder": {
          color: text.secondary,
          opacity: 0.72,
        },
      },
    },
  },
};

export default input;
