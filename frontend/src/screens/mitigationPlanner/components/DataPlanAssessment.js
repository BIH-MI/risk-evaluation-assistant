import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

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
 * transformed dataset has yet been produced or reassessed, so baseline values are shown.
 */
export default function DataPlanAssessment({ evaluation, baselineRisk }) {
  const { t } = useTranslation();

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <RATypography variant="subtitle1" fontWeight="bold">
        {t("mitigationPlanner.data.title", "Data Transformation Assessment")}
      </RATypography>
      <RABox sx={{ maxWidth: 640 }}>
        <Fact
          label={t("mitigationPlanner.data.impact", "Impact")}
          value={baselineRisk?.impactBand}
          secondary={t("mitigationPlanner.data.reassessment", "Reassessment required after transformation")}
        />
        <Fact
          label={t("mitigationPlanner.data.targetThreshold", "Overall target threshold T")}
          value={formatPercentageValue(baselineRisk?.effectiveThreshold)}
        />
        <Fact
          label={t("mitigationPlanner.data.anonymizationThreshold", "Anonymization threshold")}
          value={formatPercentageValue(evaluation.requiredDataRiskThreshold)}
        />
      </RABox>
    </RABox>
  );
}

DataPlanAssessment.propTypes = {
  evaluation: PropTypes.shape({
    requiredDataRiskThreshold: PropTypes.number,
    residualDataRisk: PropTypes.shape({ state: PropTypes.string, value: PropTypes.number }),
  }).isRequired,
  baselineRisk: PropTypes.shape({ impactBand: PropTypes.string, effectiveThreshold: PropTypes.number }),
};

DataPlanAssessment.defaultProps = { baselineRisk: null };
