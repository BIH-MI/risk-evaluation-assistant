import React, { useMemo } from 'react';
import { Tooltip, Box, alpha } from '@mui/material';
import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import colors from 'assets/theme/base/colors';
import { getRiskColor } from 'utils/riskColors';


import risk_level_0 from 'assets/images/icons/riskLevels/risk_level_0.png';
import risk_level_1 from 'assets/images/icons/riskLevels/risk_level_1.png';
import risk_level_3 from 'assets/images/icons/riskLevels/risk_level_3.png';
import risk_level_5 from 'assets/images/icons/riskLevels/risk_level_5.png';
import risk_level_10 from 'assets/images/icons/riskLevels/risk_level_10.png';

import risk_weight_0 from 'assets/images/icons/riskWeights/risk_weight_0.png';
import risk_weight_1 from 'assets/images/icons/riskWeights/risk_weight_1.png';
import risk_weight_3 from 'assets/images/icons/riskWeights/risk_weight_3.png';
import risk_weight_5 from 'assets/images/icons/riskWeights/risk_weight_5.png';
import risk_weight_10 from 'assets/images/icons/riskWeights/risk_weight_10.png';

const LEVEL_ICONS = {
  "0": risk_level_0,
  "1": risk_level_1,
  "3": risk_level_3,
  "5": risk_level_5,
  "10": risk_level_10,
};

const WEIGHT_ICONS = {
  "0": risk_weight_0,
  "1": risk_weight_1,
  "3": risk_weight_3,
  "5": risk_weight_5,
  "10": risk_weight_10,
};

const FallbackDot = ({ label, value, isLevel, index, totalOptions }) => {
  const dotColor = isLevel
    ? getRiskColor(label, { index, totalBands: totalOptions })
    : colors.secondary.main;

  return (
    <RABox display="flex" flexDirection="column" alignItems="center" justifyContent="center">
      <RABox
        sx={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: dotColor,
          mb: 0.5
        }}
      />
      <RATypography variant="caption" fontWeight="bold" sx={{ fontSize: '0.65rem' }}>
        {value}
      </RATypography>
    </RABox>
  );
};

/**
 * A highly reusable, robust toggle-scale component for Risk Levels and Weights.
 * * @param {Array} options - Array of objects: [{ label: "Low Risk", value: 1.0 }, ...]
 * @param {number} value - The currently selected value
 * @param {function} onChange - Callback fired when a new option is clicked
 * @param {string} mode - 'level' | 'weight' (determines icon set)
 * @param {string} label - Optional text label to display next to the scale
 * @param {boolean} disabled - Disables interaction
 */
function RAScale({
                   options = [],
                   value,
                   onChange,
                   mode = 'level',
                   label,
                   disabled = false,
                 }) {
  const isLevel = mode === 'level';
  const icons = isLevel ? LEVEL_ICONS : WEIGHT_ICONS;

  // Robustness check: Ensure the selected value actually exists in the options
  const isValid = useMemo(() => options.some(opt => opt.value === value), [options, value]);
  const safeValue = isValid ? value : (options.length > 0 ? options[0].value : null);

  if (!options || options.length === 0) {
    return (
      <RATypography variant="caption" color="secondary">
        No scale options available
      </RATypography>
    );
  }

  return (
    <RABox
      display="flex"
      alignItems="center"
      gap={1.5}
      sx={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {label && (
        <RATypography variant="caption" color="textSecondary" fontWeight="bold">
          {label}:
        </RATypography>
      )}

      <RABox display="flex" gap={0.5} flexWrap="wrap">
        {options.map((opt, idx) => {
          // Attempt to find the correct icon image (snapping 1.0 to "1", 5.0 to "5")
          const iconKey = String(Math.floor(opt.value));
          const iconSrc = icons[iconKey];
          const isSelected = safeValue === opt.value;

          return (
            <Tooltip key={opt.value} title={opt.label} placement="top" arrow>
              <Box
                onClick={() => {
                  if (!disabled && onChange) onChange(opt.value);
                }}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? alpha(colors.info.main, 0.15) : 'transparent',
                  border: isSelected ? `2px solid ${colors.info.main}` : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isSelected ? alpha(colors.info.main, 0.2) : alpha(colors.secondary.main, 0.1)
                  }
                }}
              >
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={opt.label}
                    style={{ width: 26, height: 26, objectFit: 'contain' }}
                  />
                ) : (
                  <FallbackDot
                    label={opt.label}
                    value={opt.value}
                    isLevel={isLevel}
                    index={idx}
                    totalOptions={options.length}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </RABox>
    </RABox>
  );
}

export const MemoRAScale = React.memo(RAScale);
export default RAScale;