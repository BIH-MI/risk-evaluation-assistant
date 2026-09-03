import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import { formatScoreRange } from "utils/AttributeScale";

export default function AttributeThresholdControls({
  identifiabilityThreshold,
  sensitivityThreshold,
  identifiabilityRange,
  sensitivityRange,
  onIdentifiabilityThresholdChange,
  onSensitivityThresholdChange,
}) {
  const { t } = useTranslation();

  return (
    <RABox
      display="flex"
      gap={2}
      justifyContent="center"
      my={3}
      mb={5}
      flexWrap="wrap"
      data-html2canvas-ignore="true"
    >
      <RAInput
        label={t("report.identifiabilityThreshold", {
          scaleRange: formatScoreRange(identifiabilityRange),
        })}
        type="number"
        inputProps={{
          min: identifiabilityRange.min,
          max: identifiabilityRange.max,
          step: "any",
        }}
        value={identifiabilityThreshold}
        onChange={(event) =>
          onIdentifiabilityThresholdChange(event.target.value)
        }
        fullWidth
        sx={{ maxWidth: 250 }}
      />
      <RAInput
        label={t("report.sensitivityThreshold", {
          scaleRange: formatScoreRange(sensitivityRange),
        })}
        type="number"
        inputProps={{
          min: sensitivityRange.min,
          max: sensitivityRange.max,
          step: "any",
        }}
        value={sensitivityThreshold}
        onChange={(event) => onSensitivityThresholdChange(event.target.value)}
        fullWidth
        sx={{ maxWidth: 250 }}
      />
    </RABox>
  );
}

const rangeType = PropTypes.shape({
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
});

AttributeThresholdControls.propTypes = {
  identifiabilityThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  sensitivityThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  identifiabilityRange: rangeType.isRequired,
  sensitivityRange: rangeType.isRequired,
  onIdentifiabilityThresholdChange: PropTypes.func.isRequired,
  onSensitivityThresholdChange: PropTypes.func.isRequired,
};
