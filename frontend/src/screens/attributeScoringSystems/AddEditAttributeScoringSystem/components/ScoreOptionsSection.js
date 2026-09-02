import React from "react";
import PropTypes from "prop-types";

import RABox from "components/layout/RABox";
import ScoreDimensionSection from "./ScoreDimensionSection";

export default function ScoreOptionsSection({
  dimensions,
  scoreOptions,
  dimensionRanges,
  validationErrors,
  dimensionErrors,
  showErrors,
  onAdd,
  onUpdate,
  onUpdateValue,
  onRemove,
}) {
  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      {dimensions.map((dimension) => (
        <ScoreDimensionSection
          key={dimension.key}
          dimension={dimension}
          options={scoreOptions[dimension.key] || []}
          range={dimensionRanges[dimension.key]}
          errors={validationErrors[dimension.key] || []}
          dimensionError={dimensionErrors[dimension.key] || ""}
          showErrors={showErrors}
          onAdd={() => onAdd(dimension.key)}
          onUpdate={(optionClientId, changes) =>
            onUpdate(dimension.key, optionClientId, changes)
          }
          onUpdateValue={(optionClientId, value, options) =>
            onUpdateValue(dimension.key, optionClientId, value, options)
          }
          onRemove={(optionClientId) => onRemove(dimension.key, optionClientId)}
        />
      ))}
    </RABox>
  );
}

ScoreOptionsSection.propTypes = {
  dimensions: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  scoreOptions: PropTypes.object.isRequired,
  dimensionRanges: PropTypes.object.isRequired,
  validationErrors: PropTypes.object.isRequired,
  dimensionErrors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onAdd: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onUpdateValue: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};
