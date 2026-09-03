import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { RISK_CHART_COLORS } from "utils/riskChartColors";
import { getCategoryConfiguration } from "../reportDataUtils";
import RiskFactorCard from "./RiskFactorCard";

const RISK_FACTOR_LEGEND_ITEMS = [
  {
    key: "positive",
    color: RISK_CHART_COLORS.positive,
    translationKey: "report.factors.positive",
    fallbackLabel: "Positive Impact",
  },
  {
    key: "neutral",
    color: RISK_CHART_COLORS.neutral,
    translationKey: "report.factors.neutral",
    fallbackLabel: "Neutral Impact",
  },
  {
    key: "negative",
    color: RISK_CHART_COLORS.negative,
    translationKey: "report.factors.negative",
    fallbackLabel: "Negative Impact",
  },
  {
    key: "highRiskTrigger",
    color: RISK_CHART_COLORS.highRiskTrigger,
    translationKey: "report.factors.highRiskTrigger",
    fallbackLabel: "High Risk Trigger",
    suffix: " (⚠️)",
  },
];

function RiskFactorLegend() {
  const { t } = useTranslation();

  return (
    <RABox
      display="flex"
      justifyContent="center"
      gap={3}
      mt={4}
      mb={2}
      flexWrap="wrap"
    >
      {RISK_FACTOR_LEGEND_ITEMS.map((item) => (
        <RABox key={item.key} display="flex" alignItems="center" gap={1}>
          <RABox
            width={14}
            height={14}
            borderRadius="2px"
            bgColor={item.color}
          />
          <RATypography variant="caption" fontWeight="medium">
            {t(item.translationKey, item.fallbackLabel)}
            {item.suffix || ""}
          </RATypography>
        </RABox>
      ))}
    </RABox>
  );
}

export default function RiskFactors({ totalRiskResult, dsConfig, rcConfig }) {
  const { t } = useTranslation();

  if (!totalRiskResult?.categoryBreakdown) {
    return null;
  }

  const unknownText = t("report.factors.unknown", "UNKNOWN");

  return (
    <RABox>
      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {Object.entries(totalRiskResult.categoryBreakdown).map(
          ([code, data]) => (
            <RiskFactorCard
              key={code}
              code={code}
              data={data}
              configuration={getCategoryConfiguration({
                categoryCode: code,
                datasetConfiguration: dsConfig,
                recipientConfiguration: rcConfig,
              })}
              unknownText={unknownText}
            />
          )
        )}
      </Grid>

      <RiskFactorLegend />
    </RABox>
  );
}

RiskFactors.propTypes = {
  totalRiskResult: PropTypes.shape({
    categoryBreakdown: PropTypes.object,
  }),
  dsConfig: PropTypes.object,
  rcConfig: PropTypes.object,
};

RiskFactors.defaultProps = {
  totalRiskResult: null,
  dsConfig: null,
  rcConfig: null,
};
