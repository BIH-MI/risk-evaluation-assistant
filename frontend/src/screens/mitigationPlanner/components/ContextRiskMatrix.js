import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatPercentageValue } from "screens/dataSharingReport/reportDataUtils";
import { buildMatrixModel, matrixCellColor } from "../utils/contextRiskMatrixModel";

const BAND_LABEL_WIDTH = 84;
const MARKER = { BASELINE: "●", PLAN: "○", COMBINED: "◉" };

function markerFor(model, row, col) {
  const isBaseline = model.from.row === row && model.from.col === col;
  const isPlan = model.to.row === row && model.to.col === col;
  if (isBaseline && isPlan) return MARKER.COMBINED;
  if (isBaseline) return MARKER.BASELINE;
  return isPlan ? MARKER.PLAN : "";
}

function MovementArrow({ model }) {
  const from = model.center(model.from);
  const to = model.center(model.to);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <defs>
        <marker id="context-matrix-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
        </marker>
      </defs>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.7"
        vectorEffect="non-scaling-stroke"
        markerEnd="url(#context-matrix-arrow)"
      />
    </svg>
  );
}

MovementArrow.propTypes = { model: PropTypes.object.isRequired };

/**
 * The configured Controls x Likelihood -> P_attack matrix. It represents the context side only:
 * Impact, T and the residual data risk q are not encoded in it (no marker sizing by Impact).
 */
export default function ContextRiskMatrix({ matrix, baseline, projected, planLabel, impactBand, targetThreshold }) {
  const { t } = useTranslation();
  const model = buildMatrixModel(matrix, baseline, projected);
  const controlsLabel = t("mitigationPlanner.matrix.controls", "Controls");
  const likelihoodLabel = t("mitigationPlanner.matrix.likelihood", "Likelihood");
  const planName = `${t("mitigationPlanner.matrix.selectedPlan", "Selected plan")} ${planLabel}`.trim();

  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={1}>
        {t("mitigationPlanner.matrix.title", "Context Risk Matrix")}
      </RATypography>
      <RABox display="flex" gap={3} flexWrap="wrap" mb={1.5}>
        <RATypography variant="body2">
          {t("mitigationPlanner.matrix.impact", "Impact / IP")}: <strong>{impactBand || "—"}</strong>
        </RATypography>
        <RATypography variant="body2">
          {t("mitigationPlanner.matrix.target", "Target threshold T")}: <strong>{formatPercentageValue(targetThreshold)}</strong>
        </RATypography>
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.matrix.unchangedNote", "Unchanged by a context-only what-if.")}
        </RATypography>
      </RABox>

      <RABox display="flex" gap={1} sx={{ overflowX: "auto" }}>
        <RABox display="flex" alignItems="center" sx={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          <RATypography variant="caption" fontWeight="bold" sx={{ color: "text.secondary" }}>
            {likelihoodLabel}
          </RATypography>
        </RABox>

        <RABox flex={1} minWidth={280}>
          <RATypography variant="caption" fontWeight="bold" display="block" textAlign="center" sx={{ color: "text.secondary", pl: `${BAND_LABEL_WIDTH}px` }}>
            {controlsLabel}
          </RATypography>
          <RABox display="flex">
            <RABox sx={{ width: BAND_LABEL_WIDTH, flexShrink: 0 }} />
            {model.controls.map((band) => (
              <RATypography key={band} variant="caption" sx={{ flex: 1, textAlign: "center", color: "text.secondary" }}>
                {band}
              </RATypography>
            ))}
          </RABox>

          <RABox display="flex">
            <RABox sx={{ width: BAND_LABEL_WIDTH, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              {model.likelihood.map((band) => (
                <RATypography key={band} variant="caption" sx={{ flex: 1, display: "flex", alignItems: "center", color: "text.secondary" }}>
                  {band}
                </RATypography>
              ))}
            </RABox>

            <RABox
              role="table"
              aria-label={t("mitigationPlanner.matrix.title", "Context Risk Matrix")}
              sx={{ flex: 1, position: "relative", display: "grid", gridTemplateColumns: `repeat(${model.controls.length}, 1fr)` }}
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
                        minHeight: 80,
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
              {model.moved && <MovementArrow model={model} />}
            </RABox>
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
          {t("mitigationPlanner.matrix.positionUnchanged", "Context-risk matrix position unchanged.")}
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
  impactBand: PropTypes.string,
  targetThreshold: PropTypes.number,
};

ContextRiskMatrix.defaultProps = {
  planLabel: "",
  impactBand: null,
  targetThreshold: null,
};
