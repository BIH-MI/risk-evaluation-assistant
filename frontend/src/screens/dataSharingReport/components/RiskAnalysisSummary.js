import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { getRiskColor } from "utils/riskColors";
import {
  formatPercentageValue,
  getCategoryClassification,
  percentageToRiskThreshold,
  riskThresholdToPercentage,
} from "../reportDataUtils";
import ReportSectionCard from "./shared/ReportSectionCard";

function ClassificationText({ classification, isProtection }) {
  const text = classification || "UNKNOWN";
  const displayText =
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

  return (
    <RATypography
      variant="body2"
      component="span"
      fontWeight="bold"
      sx={{ color: getRiskColor(text, { isProtection }), mx: 0.5 }}
    >
      {displayText}
    </RATypography>
  );
}

ClassificationText.propTypes = {
  classification: PropTypes.string,
  isProtection: PropTypes.bool,
};

ClassificationText.defaultProps = {
  classification: "UNKNOWN",
  isProtection: false,
};

function RiskPercentage({ value }) {
  return (
    <RATypography
      variant="body2"
      component="span"
      fontWeight="bold"
      ml={1}
      color="inherit"
    >
      {formatPercentageValue(value)}
    </RATypography>
  );
}

RiskPercentage.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

RiskPercentage.defaultProps = {
  value: null,
};

export default function RiskAnalysisSummary({
  totalRiskResult,
  manualRiskThreshold,
  onManualThresholdChange,
  isThresholdOverwritten,
  onThresholdOverwriteChange,
}) {
  const { t } = useTranslation();

  if (!totalRiskResult) return null;

  const unknownText = t("report.factors.unknown", "UNKNOWN");
  const impactClassification = getCategoryClassification(
    totalRiskResult,
    "IMPACT",
    unknownText
  );
  const controlsClassification = getCategoryClassification(
    totalRiskResult,
    "CONTROLS",
    unknownText
  );
  const likelihoodClassification = getCategoryClassification(
    totalRiskResult,
    "LIKELIHOOD",
    unknownText
  );
  const backendThreshold = totalRiskResult.threshold;
  const displayedThreshold = riskThresholdToPercentage(
    isThresholdOverwritten ? manualRiskThreshold : backendThreshold
  );

  const handleThresholdCommit = (value) => {
    const decimalValue = percentageToRiskThreshold(value);

    if (onManualThresholdChange) {
      onManualThresholdChange(decimalValue);
    }

    if (onThresholdOverwriteChange) {
      onThresholdOverwriteChange(
        value !== "" && value !== null && value !== undefined
      );
    }
  };

  return (
    <RABox display="flex" flexDirection="column" gap={1}>
      <ReportSectionCard
        title={t("report.summary.overallRiskTitle", "Overall risk")}
      >
        <RATypography variant="body2" component="div">
          {t("report.summary.assessedLevelFor", "The assessed level for")}{" "}
          <strong>{t("report.summary.impactName", "Impact")}</strong>{" "}
          {t("report.summary.is", "is")}{" "}
          <ClassificationText classification={impactClassification} />{" "}
          <RATypography variant="body2" component="span">
            {t("report.summary.andRecommendedThreshold", "and the recommended")}{" "}
            <strong>
              {t(
                "report.summary.reidThresholdTarget",
                "re-identification risk threshold"
              )}
            </strong>{" "}
            {t("report.summary.is", "is")}{" "}
            <RiskPercentage value={backendThreshold} />
          </RATypography>
        </RATypography>

        <RABox display="flex" alignItems="center" flexWrap="wrap" mt={3}>
          <RATypography variant="body2" component="span" mr={2}>
            {t("report.summary.youCanDefine", "You can define a")}{" "}
            <strong>
              {t(
                "report.summary.targetRiskLabel",
                "target risk re-identification threshold"
              )}
            </strong>
          </RATypography>

          <RABox width={102} display="inline-block">
            <OnBlurRAInput
              label={t("report.summary.thresholdInputLabel", "Threshold (%)")}
              placeholder="5"
              type="number"
              disabled={false}
              value={displayedThreshold}
              onCommit={handleThresholdCommit}
              fullWidth
              sx={({ palette }) => ({
                bgcolor: palette.background.default,
                "& .MuiOutlinedInput-root": { height: 40 },
              })}
            />
          </RABox>
        </RABox>
      </ReportSectionCard>

      <ReportSectionCard
        title={t("report.summary.contextRiskTitle", "Context risk")}
      >
        <RATypography variant="body2" component="div" mb={1}>
          {t("report.summary.assessedLevelFor", "The assessed level for")}{" "}
          <strong>{t("report.summary.controlsName", "Controls")}</strong>{" "}
          {t("report.summary.is", "is")}{" "}
          <ClassificationText
            classification={controlsClassification}
            isProtection
          />{" "}
          <RATypography variant="body2" component="span">
            {t("report.summary.andThe", "and the")}{" "}
            <strong>{t("report.summary.likelihoodName", "Likelihood")}</strong>{" "}
            {t("report.summary.is", "is")}{" "}
            <ClassificationText classification={likelihoodClassification} />
          </RATypography>
        </RATypography>

        <RATypography variant="body2" mt={2} component="div">
          {t("report.summary.derivedProbability", "The derived")}{" "}
          <strong>
            {t("report.summary.probabilityOfAttack", "probability of attack")}
          </strong>{" "}
          {t("report.summary.forGivenContext", "for the given context is")}{" "}
          <RiskPercentage value={totalRiskResult.contextRisk?.numericValue} />
        </RATypography>
      </ReportSectionCard>

      <ReportSectionCard title={t("report.summary.dataRiskTitle", "Data risk")}>
        <RATypography variant="body2">
          {t("report.summary.theRecommended", "The recommended")}{" "}
          <strong>
            {t(
              "report.summary.riskThresholdAnon",
              "risk threshold for anonymization"
            )}
          </strong>{" "}
          {t("report.summary.is", "is")}{" "}
          <RiskPercentage value={totalRiskResult.finalRisk?.numericValue} />
        </RATypography>
      </ReportSectionCard>
    </RABox>
  );
}

RiskAnalysisSummary.propTypes = {
  totalRiskResult: PropTypes.shape({
    categoryBreakdown: PropTypes.object,
    contextRisk: PropTypes.shape({
      numericValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    finalRisk: PropTypes.shape({
      numericValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    threshold: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  manualRiskThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  onManualThresholdChange: PropTypes.func,
  isThresholdOverwritten: PropTypes.bool,
  onThresholdOverwriteChange: PropTypes.func,
};

RiskAnalysisSummary.defaultProps = {
  totalRiskResult: null,
  manualRiskThreshold: "",
  onManualThresholdChange: null,
  isThresholdOverwritten: false,
  onThresholdOverwriteChange: null,
};
