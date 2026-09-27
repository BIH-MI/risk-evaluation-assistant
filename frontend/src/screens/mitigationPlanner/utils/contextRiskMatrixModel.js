import { alpha } from "@mui/material/styles";

const sameLabel = (left, right) =>
  String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

/**
 * Grid model of the configured Controls x Likelihood -> P_attack matrix. Band order and cell
 * values come from the active risk configuration; nothing is hard-coded here.
 */
export function buildMatrixModel(matrix, baseline, projected) {
  const controls = matrix.controlsBands;
  // Highest likelihood on top, as in a conventional risk matrix.
  const likelihood = [...matrix.likelihoodBands].reverse();
  const probabilities = matrix.cells
    .map((cell) => cell.attackProbability)
    .filter((value) => value !== null && value !== undefined);

  const locate = (state) => ({
    col: controls.findIndex((band) => sameLabel(band, state?.controlsBand)),
    row: likelihood.findIndex((band) => sameLabel(band, state?.likelihoodBand)),
  });
  const from = locate(baseline);
  const to = locate(projected);
  const placed = (position) => position.col >= 0 && position.row >= 0;
  const sameCell = placed(from) && placed(to) && from.col === to.col && from.row === to.row;

  return {
    controls,
    likelihood,
    minProbability: probabilities.length ? Math.min(...probabilities) : 0,
    maxProbability: probabilities.length ? Math.max(...probabilities) : 0,
    from,
    to,
    sameCell,
    cellAt: (likelihoodBand, controlsBand) =>
      matrix.cells.find(
        (cell) => sameLabel(cell.controlsBand, controlsBand) && sameLabel(cell.likelihoodBand, likelihoodBand)
      ),
  };
}

function parseRgb(color) {
  const value = String(color || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return {
      r: parseInt(value.slice(1, 3), 16),
      g: parseInt(value.slice(3, 5), 16),
      b: parseInt(value.slice(5, 7), 16),
    };
  }
  const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return rgb ? { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) } : { r: 128, g: 128, b: 128 };
}

function mixColor(left, right, amount) {
  const a = parseRgb(left);
  const b = parseRgb(right);
  const mix = (start, end) => Math.round(start + (end - start) * amount);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

/**
 * Background colour of one matrix cell.
 *
 * PRESENTATIONAL ONLY: the configured P_attack values are min-max normalised purely to pick a
 * colour between the theme's success, warning and error tones. This does not create new risk
 * bands or categories; the printed percentage stays authoritative. If the risk configuration
 * later provides explicit matrix colours, those should be used instead.
 */
export function matrixCellColor(probability, model, palette) {
  if (probability === null || probability === undefined) return palette.action.hover;
  const span = model.maxProbability - model.minProbability;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (probability - model.minProbability) / span)) : 0.5;
  const base =
    ratio <= 0.5
      ? mixColor(palette.success.main, palette.warning.main, ratio / 0.5)
      : mixColor(palette.warning.main, palette.error.main, (ratio - 0.5) / 0.5);
  return alpha(base, palette.mode === "dark" ? 0.42 : 0.3);
}
