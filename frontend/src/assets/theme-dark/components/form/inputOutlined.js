import borders from "assets/theme-dark/base/borders";
import colors from "assets/theme-dark/base/colors";
import typography from "assets/theme-dark/base/typography";

import pxToRem from "assets/theme-dark/functions/pxToRem";
import rgba from "assets/theme-dark/functions/rgba";

const { inputBorderColor, info, text, transparent, white } = colors;
const { borderRadius } = borders;
const { size } = typography;

const inputOutlined = {
  styleOverrides: {
    root: {
      backgroundColor: transparent.main,
      color: text.primary || text.main,
      fontSize: size.sm,
      borderRadius: borderRadius.md,

      "&.Mui-disabled": {
        color: text.disabled,
      },

      "& .MuiInputBase-input.Mui-disabled, & .MuiSelect-select.Mui-disabled": {
        color: text.disabled,
        WebkitTextFillColor: text.disabled,
      },

      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: rgba(inputBorderColor, 0.6),
      },

      "&.Mui-focused": {
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: info.main,
        },
      },
    },

    notchedOutline: {
      borderColor: rgba(inputBorderColor, 0.6),
    },

    input: {
      color: "inherit",
      padding: pxToRem(12),
      backgroundColor: transparent.main,

      "&::-webkit-input-placeholder": {
        color: text.secondary,
        opacity: 0.72,
      },
      "&::placeholder": {
        color: text.secondary,
        opacity: 0.72,
      },
    },

    inputSizeSmall: {
      fontSize: size.xs,
      padding: pxToRem(10),
    },

    multiline: {
      color: white.main,
      padding: 0,
    },

    inputMultiline: {
      color: white.main,

      "&.Mui-disabled": {
        color: text.disabled,
        WebkitTextFillColor: text.disabled,
      },
    },
  },
};

export default inputOutlined;
