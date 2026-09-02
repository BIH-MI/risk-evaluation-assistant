import React from "react";
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";

import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import { PREDEFINED_SCORE_LABELS } from "../attributeScoringSystemConstants";
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
  return (
    <RABox
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(220px, 1fr) minmax(160px, 220px) auto",
        },
        columnGap: { xs: 0, md: 2 },
        rowGap: 1,
        alignItems: "center",
      }}
    >
      <RAInput
        select
        label="Display label"
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
            {label}
          </MenuItem>
        ))}
      </RAInput>
      <ScoreValueInput
        value={option.value}
        range={range}
        onCommit={onValueCommit}
        error={showErrors && Boolean(errors.value)}
        helperText={showErrors ? errors.value : ""}
      />
      <RABox
        display="flex"
        justifyContent={{ xs: "flex-start", md: "flex-end" }}
        gap={0.5}
      >
        <Tooltip
          title={
            canRemove ? "Delete" : "At least two score options are required."
          }
          arrow
        >
          <span>
            <IconButton
              size="small"
              disabled={!canRemove}
              sx={getOptionActionButtonSx}
              onClick={onRemove}
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
