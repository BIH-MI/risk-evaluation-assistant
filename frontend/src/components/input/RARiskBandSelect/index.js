import React, { useMemo } from 'react';
import { MenuItem } from '@mui/material';
import RAInput from 'components/input/RAInput';
import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import { getRiskColor } from 'utils/riskColors';

// =========================================================================
// 1. IMPORT ICONS
// Adjust paths based on your actual asset folder structure
// =========================================================================
import noneIcon from 'assets/images/icons/riskBands/none.png';
import compliantIcon from 'assets/images/icons/riskBands/compliant.png';
import lowIcon from 'assets/images/icons/riskBands/low.png';
import mediumIcon from 'assets/images/icons/riskBands/medium.png';
import highIcon from 'assets/images/icons/riskBands/high.png';
import maxIcon from 'assets/images/icons/riskBands/max.png';
import reviewIcon from 'assets/images/icons/riskBands/review.png';

const BAND_ICONS = {
  'NONE': noneIcon,
  'COMPLIANT': compliantIcon,
  'LOW': lowIcon,
  'MEDIUM': mediumIcon,
  'HIGH': highIcon,
  'MAX': maxIcon,
  'REVIEW': reviewIcon
};

export const STANDARD_BAND_LABELS = ['NONE', 'COMPLIANT', 'LOW', 'MEDIUM', 'HIGH', 'MAX', 'REVIEW'];

const BandOption = React.memo(({ label }) => {
  const upperLabel = String(label || '').toUpperCase();
  const iconSrc = BAND_ICONS[upperLabel];

  return (
    <RABox display="flex" alignItems="center" justifyContent="flex-start" width="100%" height="28px">
      {iconSrc ? (
        // If it's a standard band, render the badge image (which already includes the text)
        <img src={iconSrc} alt={label} style={{ height: '100%', objectFit: 'contain' }} />
      ) : (
        // Fallback for custom bands
        <RABox display="flex" alignItems="center" gap={1}>
          <RABox sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: getRiskColor(label) }} />
          <RATypography variant="caption" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
            {label || 'Select...'}
          </RATypography>
        </RABox>
      )}
    </RABox>
  );
});

export default function RiskBandSelect({ value, options = [], onChange, disabled = false, sx }) {
  // Ensure the currently selected value is always in the options list, even if it's a custom one
  const safeOptions = useMemo(() => {
    return [...new Set([...options, ...(value && !options.includes(value) ? [value] : [])])];
  }, [options, value]);

  return (
    <RAInput
      variant="outlined"
      select
      size="small"
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      disabled={disabled}
      sx={{
        width: '100%',
        '& .MuiInputBase-root': { height: '40px' },
        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', p: 1 },
        ...sx
      }}
      SelectProps={{
        MenuProps: {
          PaperProps: { sx: { padding: '0px', minWidth: 'unset !important' } }
        }
      }}
    >
      {safeOptions.map((opt, idx) => (
        <MenuItem key={`${opt}-${idx}`} value={opt}>
          <BandOption label={opt} />
        </MenuItem>
      ))}

      {safeOptions.length === 0 && (
        <MenuItem value="" disabled>
          <RATypography variant="caption">No options</RATypography>
        </MenuItem>
      )}
    </RAInput>
  );
}