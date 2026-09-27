import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatPercentageValue } from "screens/dataSharingReport/reportDataUtils";
import { buildMatrixModel, matrixCellColor } from "../utils/contextRiskMatrixModel";
import { formatUnchangedMatrixPosition } from "../utils/mitigationPlannerFormatters";

const BAND_LABEL_WIDTH = 84;
const CELL_MIN_HEIGHT = 80;
const MARKER = { BASELINE: "●", PLAN: "○", COMBINED: "◉" };

function markerFor(model, row, col) {
  const isBaseline = model.from.row === row && model.from.col === col;
  const isPlan = model.to.row === row && model.to.col === col;
  if (isBaseline && isPlan) return MARKER.COMBINED;
  if (isBaseline) return MARKER.BASELINE;
  return isPlan ? MARKER.PLAN : "";
}

/**
 * The configured Controls x Likelihood -> P_attack matrix. It represents the context side only:
 * Impact, T and the residual data risk q are not encoded in it. Markers come from the backend's
 * recalculated baseline/projected bands and move only when a band actually changes.
 *
 * Layout is a 3x3 grid (axis title | band labels | cells) x (Controls title | band labels | cells),
 * so the vertical Likelihood title is centred on the cells rather than on the whole figure.
 */
export default function ContextRiskMatrix({ matrix, baseline, projected, planLabel, categoryOutcomes }) {
  const { t } = useTranslation();
  const model = buildMatrixModel(matrix, baseline, projected);
  const controlsLabel = t("mitigationPlanner.matrix.controls", "Controls");
  const likelihoodLabel = t("mitigationPlanner.matrix.likelihood", "Likelihood");
  const planName = `${t("mitigationPlanner.matrix.selectedPlan", "Selected plan")} ${planLabel}`.trim();
  const rowTemplate = `repeat(${model.likelihood.length}, minmax(${CELL_MIN_HEIGHT}px, auto))`;
  const axisLabelSx = { color: "text.secondary" };

  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={1}>
        {t("mitigationPlanner.matrix.title", "Context Risk Matrix")}
      </RATypography>

      <RABox sx={{ overflowX: "auto" }}>
        <RABox
          sx={{
            display: "grid",
            gridTemplateColumns: `auto ${BAND_LABEL_WIDTH}px minmax(240px, 1fr)`,
            gridTemplateRows: "auto auto auto",
            columnGap: 1,
            minWidth: 360,
          }}
        >
          <RATypography variant="caption" fontWeight="bold" sx={{ ...axisLabelSx, gridColumn: 3, gridRow: 1, justifySelf: "center" }}>
            {controlsLabel}
          </RATypography>

          <RABox sx={{ gridColumn: 3, gridRow: 2, display: "grid", gridTemplateColumns: `repeat(${model.controls.length}, 1fr)` }}>
            {model.controls.map((band) => (
              <RATypography key={band} variant="caption" sx={{ ...axisLabelSx, textAlign: "center" }}>
                {band}
              </RATypography>
            ))}
          </RABox>

          <RATypography
            variant="caption"
            fontWeight="bold"
            sx={{
              ...axisLabelSx,
              gridColumn: 1,
              gridRow: 3,
              alignSelf: "center",
              justifySelf: "center",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            {likelihoodLabel}
          </RATypography>

          <RABox sx={{ gridColumn: 2, gridRow: 3, display: "grid", gridTemplateRows: rowTemplate }}>
            {model.likelihood.map((band) => (
              <RATypography key={band} variant="caption" sx={{ ...axisLabelSx, alignSelf: "center" }}>
                {band}
              </RATypography>
            ))}
          </RABox>

          <RABox
            role="table"
            aria-label={t("mitigationPlanner.matrix.title", "Context Risk Matrix")}
            sx={{
              gridColumn: 3,
              gridRow: 3,
              position: "relative",
              display: "grid",
              gridTemplateColumns: `repeat(${model.controls.length}, 1fr)`,
              gridTemplateRows: rowTemplate,
            }}
          >
            {model.likelihood.flatMap((likelihoodBand, row) =>
              model.controls.map((controlsBand, col) => {
                const cell = model.cellAt(likelihoodBand, controlsBand);
                const probability = cell?.attackProbability;
                return (
                  <RABox
                    key={`${likelihoodBand}:${controlsBand}`}
                    role="cell"
                    aria-label={`${controlsLabel} ${controlsBand}, ${likelihoodLabel} ${likelihoodBand}: ${formatPercentageValue(probability)}`}
                    sx={{
                      border: ({ palette }) => `1px solid ${palette.divider}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: ({ palette }) => matrixCellColor(probability, model, palette),
                    }}
                  >
                    <RATypography variant="body2">{cell ? formatPercentageValue(probability) : "—"}</RATypography>
                    <RATypography variant="h6" lineHeight={1} aria-hidden="true">
                      {markerFor(model, row, col)}
                    </RATypography>
                  </RABox>
                );
              })
            )}
          </RABox>
        </RABox>
      </RABox>

      <RABox display="flex" gap={3} mt={1} flexWrap="wrap">
        {model.sameCell ? (
          <RATypography variant="caption">
            {MARKER.COMBINED} {t("mitigationPlanner.matrix.legendCombined", "Baseline and")} {planName}
          </RATypography>
        ) : (
          <>
            <RATypography variant="caption">
              {MARKER.BASELINE} {t("mitigationPlanner.matrix.legendBaseline", "Baseline")}
            </RATypography>
            <RATypography variant="caption">
              {MARKER.PLAN} {planName}
            </RATypography>
          </>
        )}
      </RABox>
      {model.sameCell && (
        <RATypography variant="body2" mt={0.5} sx={{ color: "text.secondary" }}>
          {formatUnchangedMatrixPosition(categoryOutcomes)}
        </RATypography>
      )}
    </RABox>
  );
}

const stateShape = PropTypes.shape({
  controlsBand: PropTypes.string,
  likelihoodBand: PropTypes.string,
  attackProbability: PropTypes.number,
});

ContextRiskMatrix.propTypes = {
  matrix: PropTypes.shape({
    controlsBands: PropTypes.arrayOf(PropTypes.string).isRequired,
    likelihoodBands: PropTypes.arrayOf(PropTypes.string).isRequired,
    cells: PropTypes.array.isRequired,
  }).isRequired,
  baseline: stateShape.isRequired,
  projected: stateShape.isRequired,
  planLabel: PropTypes.string,
  categoryOutcomes: PropTypes.arrayOf(PropTypes.shape({ categoryCode: PropTypes.string, reason: PropTypes.string })),
};

ContextRiskMatrix.defaultProps = {
  planLabel: "",
  categoryOutcomes: [],
};
