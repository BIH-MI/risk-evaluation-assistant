import React from "react";
import PropTypes from "prop-types";
import { MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import RAInput from "components/input/RAInput";
import { DATASET_TYPE_IDS } from "../ai/datasetTypes";

const key = (name) => `datasets.datasetType.${name}`;

/**
 * Dataset type select. The AI model's suggestion, when there is one, is
 * named in the helper text with its score; the researcher's choice is what
 * is saved.
 */
export function DatasetTypeField({
  value,
  onChange,
  suggestion,
  classifying,
  hint,
  disabled,
}) {
  const { t, i18n } = useTranslation();
  const percent = suggestion
    ? new Intl.NumberFormat(i18n.language, { style: "percent" }).format(
        suggestion.score
      )
    : null;

  const helperText = classifying
    ? t(key("classifying"))
    : suggestion
    ? t(key("suggested"), {
        type: t(key(`types.${suggestion.type}`)),
        score: percent,
      })
    : hint || t(key("helper"));

  return (
    <RAInput
      select
      label={t(key("label"))}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      fullWidth
      disabled={disabled}
      helperText={helperText}
    >
      <MenuItem value="">
        <em>{t(key("none"))}</em>
      </MenuItem>
      {DATASET_TYPE_IDS.map((type) => (
        <MenuItem key={type} value={type}>
          {t(key(`types.${type}`))}
        </MenuItem>
      ))}
    </RAInput>
  );
}

DatasetTypeField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  // The AI model's suggestion ({ type, score }), if any.
  suggestion: PropTypes.shape({
    type: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
  }),
  classifying: PropTypes.bool,
  // Helper text while there is no suggestion (default: what the type means).
  hint: PropTypes.string,
  disabled: PropTypes.bool,
};

DatasetTypeField.defaultProps = {
  value: "",
  suggestion: null,
  classifying: false,
  hint: "",
  disabled: false,
};
