import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { alpha, useTheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import { MIN_SCORE_VALUE } from "../attributeScoringSystemConstants";
import {
  normalizeDisplayNumber,
  normalizeScoreOptionValue,
} from "../attributeScoringSystemFormUtils";

function getFiniteDraftNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getValueTone(value, range, theme) {
  const numeric = getFiniteDraftNumber(value);
  const neutral = theme.palette.text.main;

  if (
    numeric === null ||
    !Number.isFinite(range?.min) ||
    !Number.isFinite(range?.max) ||
    range.min === range.max
  ) {
    return {
      bg: alpha(neutral, 0.12),
      border: alpha(neutral, 0.35),
      color: neutral,
      buttonBg: alpha(neutral, 0.16),
    };
  }

  const ratio = Math.min(
    1,
    Math.max(0, (numeric - range.min) / (range.max - range.min))
  );

  if (ratio <= 0.2) {
    return createTone(theme.palette.success.main, theme, 0.14, 0.5, 0.18);
  }

  if (ratio <= 0.4) {
    return createTone(theme.palette.success.focus, theme, 0.16, 0.52, 0.2);
  }

  if (ratio <= 0.65) {
    return createTone(theme.palette.warning.main, theme, 0.18, 0.58, 0.24);
  }

  if (ratio <= 0.85) {
    return createTone(theme.palette.warning.focus, theme, 0.15, 0.56, 0.22);
  }

  return createTone(theme.palette.error.main, theme, 0.13, 0.52, 0.18);
}

function createTone(color, theme, bgAlpha, borderAlpha, buttonAlpha) {
  return {
    bg: alpha(color, bgAlpha),
    border: alpha(color, borderAlpha),
    color,
    buttonBg: alpha(color, buttonAlpha),
    buttonHoverBg: alpha(color, Math.min(buttonAlpha + 0.08, 0.3)),
  };
}

export default function ScoreValueInput({
  value,
  range,
  onCommit,
  error,
  helperText,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [draftValue, setDraftValue] = useState(value ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const tone = getValueTone(draftValue, range, theme);
  const numericValue = useMemo(
    () => getFiniteDraftNumber(draftValue),
    [draftValue]
  );
  const canDecrease = numericValue !== null && numericValue > MIN_SCORE_VALUE;

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(value ?? "");
    }
  }, [isFocused, value]);

  const commitValue = (nextValue) => {
    const normalizedValue = normalizeScoreOptionValue(nextValue);

    setDraftValue(normalizedValue);
    onCommit(normalizedValue, { commit: true });
  };

  const handleDecrease = () => {
    const current = getFiniteDraftNumber(draftValue);

    if (current === null || current <= MIN_SCORE_VALUE) {
      return;
    }

    commitValue(normalizeDisplayNumber(Math.max(MIN_SCORE_VALUE, current - 1)));
  };

  const handleIncrease = () => {
    const current = getFiniteDraftNumber(draftValue);
    const nextValue =
      current === null
        ? MIN_SCORE_VALUE + 1
        : Math.max(MIN_SCORE_VALUE, current + 1);

    commitValue(normalizeDisplayNumber(nextValue));
  };

  return (
    <RABox>
      <RABox
        display="flex"
        alignItems="center"
        sx={{
          width: "100%",
          maxWidth: 170,
          borderRadius: 999,
          border: `1px solid ${
            error ? alpha(theme.palette.error.main, 0.8) : tone.border
          }`,
          bgcolor: tone.bg,
          overflow: "hidden",
        }}
      >
        <IconButton
          size="small"
          aria-label={t(
            "attributeScoringSystems.scoreOptions.decreaseValue",
            "Decrease score value"
          )}
          disabled={!canDecrease}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleDecrease}
          sx={{
            width: 40,
            height: 40,
            bgcolor: tone.buttonBg,
            "&:hover": { bgcolor: tone.buttonHoverBg },
            "&.Mui-disabled": {
              bgcolor: "transparent",
            },
          }}
        >
          <RemoveIcon
            fontSize="small"
            sx={{
              color: canDecrease
                ? tone.color
                : alpha(theme.palette.text.main, 0.24),
            }}
          />
        </IconButton>
        <RAInput
          type="number"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            commitValue(draftValue);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          inputProps={{
            min: MIN_SCORE_VALUE,
            step: "any",
            "aria-label": t(
              "attributeScoringSystems.scoreOptions.scoreValue",
              "Score value"
            ),
          }}
          sx={{
            flex: 1,
            minWidth: 72,
            "& .MuiOutlinedInput-root": {
              height: 40,
              bgcolor: "transparent",
              borderRadius: 0,
              "& fieldset": { border: "none" },
              "&:hover fieldset": { border: "none" },
              "&.Mui-focused fieldset": { border: "none" },
            },
            "& .MuiOutlinedInput-input": {
              textAlign: "center",
              fontWeight: 800,
              color: tone.color,
              p: 0,
            },
            "& input[type=number]": {
              MozAppearance: "textfield",
            },
            "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
              {
                WebkitAppearance: "none",
                margin: 0,
              },
          }}
        />
        <IconButton
          size="small"
          aria-label={t(
            "attributeScoringSystems.scoreOptions.increaseValue",
            "Increase score value"
          )}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleIncrease}
          sx={{
            width: 40,
            height: 40,
            bgcolor: tone.buttonBg,
            "&:hover": { bgcolor: tone.buttonHoverBg },
          }}
        >
          <AddIcon fontSize="small" sx={{ color: tone.color }} />
        </IconButton>
      </RABox>
      {helperText && (
        <RATypography variant="caption" color="error" display="block" mt={0.5}>
          {helperText}
        </RATypography>
      )}
    </RABox>
  );
}

ScoreValueInput.defaultProps = {
  error: false,
  helperText: "",
};

ScoreValueInput.propTypes = {
  value: PropTypes.string.isRequired,
  range: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
  onCommit: PropTypes.func.isRequired,
  error: PropTypes.bool,
  helperText: PropTypes.string,
};
