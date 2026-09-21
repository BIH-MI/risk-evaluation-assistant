import borders from "assets/theme/base/borders";
import colors from "assets/theme/base/colors";
import typography from "assets/theme/base/typography";

import pxToRem from "assets/theme/functions/pxToRem";

const { inputBorderColor, info, text, transparent } = colors;
const { borderRadius } = borders;
const { size } = typography;

const inputOutlined = {
  styleOverrides: {
    root: {
      backgroundColor: transparent.main,
      color: text.primary,
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
        borderColor: inputBorderColor,
      },

      "&.Mui-focused": {
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: info.main,
        },
      },
    },

    notchedOutline: {
      borderColor: inputBorderColor,
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
      color: "inherit",
      padding: 0,
    },
  },
};

export default inputOutlined;
