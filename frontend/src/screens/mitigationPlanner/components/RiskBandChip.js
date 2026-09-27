import PropTypes from "prop-types";
import { Chip } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { getRiskColor } from "utils/riskColors";

const NEUTRAL_FALLBACK = "#dddddd";

function formatBand(band) {
  const text = String(band).replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Qualitative REA risk band shown as a semantic chip. Colours follow the application's
 * getRiskColor convention; protective categories (Controls) are inverted so that strong
 * controls read as favourable. The band text is always shown, so colour is never the only cue.
 */
export default function RiskBandChip({ band, isProtection }) {
  if (!band) return <strong>—</strong>;

  const color = getRiskColor(band, { isProtection });
  const neutral = color === NEUTRAL_FALLBACK;

  return (
    <Chip
      size="small"
      variant="outlined"
      label={formatBand(band)}
      sx={
        neutral
          ? { fontWeight: 600 }
          : {
              fontWeight: 600,
              color,
              borderColor: color,
              backgroundColor: alpha(color, 0.12),
            }
      }
    />
  );
}

RiskBandChip.propTypes = {
  band: PropTypes.string,
  isProtection: PropTypes.bool,
};

RiskBandChip.defaultProps = { band: null, isProtection: false };
