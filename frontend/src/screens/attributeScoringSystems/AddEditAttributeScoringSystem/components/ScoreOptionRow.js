import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { alpha } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";

import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import {
  PREDEFINED_SCORE_LABELS,
  SCORE_LABEL_TRANSLATION_KEYS,
} from "../attributeScoringSystemConstants";
import { normalizeScoreLabel } from "../attributeScoringSystemFormUtils";
import ScoreValueInput from "./ScoreValueInput";

function getOptionActionButtonSx(theme) {
  const actionColor = theme.palette.text.main;

  return {
    width: 32,
    height: 32,
    border: `1px solid ${theme.palette.divider}`,
    color: actionColor,
    bgcolor: alpha(actionColor, 0.08),
    "&:hover": {
      bgcolor: alpha(actionColor, 0.16),
    },
    "&.Mui-disabled": {
      color: alpha(actionColor, 0.24),
      borderColor: alpha(actionColor, 0.12),
      bgcolor: "transparent",
    },
  };
}

export default function ScoreOptionRow({
  option,
  range,
  errors,
  showErrors,
  usedLabels,
  canRemove,
  onLabelChange,
  onValueCommit,
  onRemove,
}) {
  const { t } = useTranslation();
  const deleteTooltipTitle = canRemove
    ? t("attributeScoringSystems.scoreOptions.deleteOptionTooltip", "Delete")
    : t(
        "attributeScoringSystems.scoreOptions.errors.minOptionsRequired",
        "At least two score options are required."
      );

  return (
    <RABox
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(220px, 1fr) auto",
        },
        columnGap: { xs: 0, md: 2 },
        rowGap: 1,
        alignItems: "center",
      }}
    >
      <RAInput
        select
        label={t(
          "attributeScoringSystems.scoreOptions.displayLabel",
          "Display label"
        )}
        value={option.label}
        onChange={(event) => onLabelChange(event.target.value)}
        fullWidth
        error={showErrors && Boolean(errors.label)}
        helperText={showErrors ? errors.label : ""}
      >
        {PREDEFINED_SCORE_LABELS.map((label) => (
          <MenuItem
            key={label}
            value={label}
            disabled={usedLabels.has(normalizeScoreLabel(label))}
          >
            {t(SCORE_LABEL_TRANSLATION_KEYS[label], label)}
          </MenuItem>
        ))}
      </RAInput>
      {/* Value control and delete action share one flex group so a longer
          translated label never pushes the delete button away from the counter. */}
      <RABox
        display="flex"
        alignItems="center"
        justifyContent={{ xs: "flex-start", md: "flex-end" }}
        gap={1}
      >
        <ScoreValueInput
          value={option.value}
          range={range}
          onCommit={onValueCommit}
          error={showErrors && Boolean(errors.value)}
          helperText={showErrors ? errors.value : ""}
        />
        <Tooltip title={deleteTooltipTitle} arrow>
          <span>
            <IconButton
              size="small"
              disabled={!canRemove}
              sx={getOptionActionButtonSx}
              onClick={onRemove}
              aria-label={t(
                "attributeScoringSystems.scoreOptions.deleteOption",
                "Delete option"
              )}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </RABox>
    </RABox>
  );
}

ScoreOptionRow.propTypes = {
  option: PropTypes.shape({
    clientId: PropTypes.string,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
  range: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  usedLabels: PropTypes.instanceOf(Set).isRequired,
  canRemove: PropTypes.bool.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onValueCommit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
