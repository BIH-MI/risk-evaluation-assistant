import React from "react";
import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import {
  MAX_SCORE_OPTIONS_PER_DIMENSION,
  MIN_SCORE_OPTIONS_PER_DIMENSION,
} from "../attributeScoringSystemConstants";
import { normalizeScoreLabel } from "../attributeScoringSystemFormUtils";
import ScoreOptionRow from "./ScoreOptionRow";

export default function ScoreDimensionSection({
  dimension,
  options,
  range,
  errors,
  dimensionError,
  showErrors,
  onAdd,
  onUpdate,
  onUpdateValue,
  onRemove,
}) {
  const optionCount = options.length;
  const hasReachedOptionLimit = optionCount >= MAX_SCORE_OPTIONS_PER_DIMENSION;
  const canRemoveOptions = optionCount > MIN_SCORE_OPTIONS_PER_DIMENSION;

  const getUsedLabels = (currentIndex) =>
    new Set(
      options
        .filter((_, optionIndex) => optionIndex !== currentIndex)
        .map((option) => normalizeScoreLabel(option.label))
        .filter(Boolean)
    );

  return (
    <RABox>
      <RABox
        mb={1}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
      >
        <RATypography variant="h6">{dimension.label}</RATypography>
        <Tooltip
          title={
            hasReachedOptionLimit
              ? `Maximum of ${MAX_SCORE_OPTIONS_PER_DIMENSION} score options reached`
              : "Add option"
          }
          arrow
        >
          <span>
            <RAButton
              type="button"
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              disabled={hasReachedOptionLimit}
              onClick={onAdd}
            >
              Add Option
            </RAButton>
          </span>
        </Tooltip>
      </RABox>

      <RABox display="flex" flexDirection="column" gap={1}>
        {options.map((option, index) => (
          <ScoreOptionRow
            key={option.clientId}
            option={option}
            range={range}
            errors={errors[index] || {}}
            showErrors={showErrors}
            usedLabels={getUsedLabels(index)}
            canRemove={canRemoveOptions}
            onLabelChange={(label) => onUpdate(option.clientId, { label })}
            onValueCommit={(value, options) =>
              onUpdateValue(option.clientId, value, options)
            }
            onRemove={() => onRemove(option.clientId)}
          />
        ))}
      </RABox>

      {showErrors && dimensionError && (
        <RATypography variant="caption" color="error" display="block" mt={1}>
          {dimensionError}
        </RATypography>
      )}
    </RABox>
  );
}

ScoreDimensionSection.propTypes = {
  dimension: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  range: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
  }).isRequired,
  errors: PropTypes.arrayOf(PropTypes.object).isRequired,
  dimensionError: PropTypes.string.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onUpdateValue: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
