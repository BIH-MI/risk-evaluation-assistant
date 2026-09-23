import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatPercentageValue } from "screens/dataSharingReport/reportDataUtils";

function Fact({ label, value, secondary }) {
  return (
    <RABox display="flex" justifyContent="space-between" gap={3} py={0.5} flexWrap="wrap">
      <RATypography variant="body2">{label}</RATypography>
      <RATypography variant="body2" textAlign="right">
        <strong>{value}</strong>
        {secondary && (
          <RATypography component="span" variant="caption" display="block" sx={{ color: "text.secondary" }}>
            {secondary}
          </RATypography>
        )}
      </RATypography>
    </RABox>
  );
}

Fact.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string, secondary: PropTypes.string };
Fact.defaultProps = { value: "—", secondary: null };

/**
 * Data side of a plan. Selecting a data transformation does not change Impact/T because no
 * transformed dataset has yet been produced or reassessed, so baseline values are shown and q is
 * reported as not evaluated.
 */
export default function DataPlanAssessment({ evaluation, baselineRisk, contextUnchanged }) {
  const { t } = useTranslation();
  const q = evaluation.residualDataRisk;
  const qEvaluated = q?.state === "EVALUATED";

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <RATypography variant="subtitle1" fontWeight="bold">
        {t("mitigationPlanner.data.title", "Data Transformation Assessment")}
      </RATypography>
      {contextUnchanged && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.data.contextUnchanged", "Context risk unchanged because no Context Control is included.")}
        </RATypography>
      )}
      <RABox sx={{ maxWidth: 640 }}>
        <Fact
          label={t("mitigationPlanner.data.impact", "Impact / Invasion of Privacy")}
          value={baselineRisk?.impactBand}
          secondary={t("mitigationPlanner.data.reassessment", "Reassessment required after transformation")}
        />
        <Fact
          label={t("mitigationPlanner.data.targetThreshold", "Overall target threshold T")}
          value={formatPercentageValue(baselineRisk?.effectiveThreshold)}
        />
        <Fact
          label={t("mitigationPlanner.data.rAnon", "Required data-risk threshold R_anon")}
          value={formatPercentageValue(evaluation.requiredDataRiskThreshold)}
        />
        <Fact
          label={t("mitigationPlanner.data.q", "Measured residual data risk q")}
          value={qEvaluated ? formatPercentageValue(q.value) : t("mitigationPlanner.risk.notEvaluated", "Not evaluated")}
        />
      </RABox>
      {!qEvaluated && (
        <RABox display="flex" alignItems="flex-start" gap={1}>
          <InfoOutlinedIcon fontSize="small" sx={{ color: "info.main", mt: 0.25 }} />
          <RABox>
            <RATypography variant="body2" fontWeight="bold">
              {t("mitigationPlanner.data.evaluationRequired", "Data-risk evaluation required")}
            </RATypography>
            <RATypography variant="body2" sx={{ color: "text.secondary" }}>
              {t(
                "mitigationPlanner.data.evaluationRequiredText",
                "REA has not executed the proposed transformations. Residual data risk q is therefore not yet known and cannot yet be compared with the required anonymisation threshold."
              )}
            </RATypography>
          </RABox>
        </RABox>
      )}
    </RABox>
  );
}

DataPlanAssessment.propTypes = {
  evaluation: PropTypes.shape({
    requiredDataRiskThreshold: PropTypes.number,
    residualDataRisk: PropTypes.shape({ state: PropTypes.string, value: PropTypes.number }),
  }).isRequired,
  baselineRisk: PropTypes.shape({ impactBand: PropTypes.string, effectiveThreshold: PropTypes.number }),
  contextUnchanged: PropTypes.bool,
};

DataPlanAssessment.defaultProps = { baselineRisk: null, contextUnchanged: false };
