import React from "react";
import RABox from "../../components/layout/RABox";
import RATypography from "../../components/display/RATypography";
import OnBlurRAInput from "../../components/input/RAInput/OnBlurRAInput";
import { getRiskColor } from "../../utils/riskColors";
import { useTranslation } from "react-i18next";

/**
 * Renders the static classification text with appropriate coloring.
 * Formats text to Title Case (e.g. "Low", "Medium").
 */
const renderStaticClassification = (classification, isProtection) => {
  const text = classification || "UNKNOWN";
  const color = getRiskColor(text, { isProtection });

  const displayText =
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

  return (
    <RATypography
      variant="body2"
      component="span"
      fontWeight="bold"
      sx={{ color: color, mx: 0.5 }}
    >
      {displayText}
    </RATypography>
  );
};

/**
 * Renders a percentage value.
 */
const renderRiskPercentage = (val) => {
  const str =
    val !== null && val !== undefined ? (val * 100).toFixed(2) + "%" : "—";

  return (
    <RATypography
      variant="body2"
      component="span"
      fontWeight="bold"
      ml={1}
      color="inherit"
    >
      {str}
    </RATypography>
  );
};

export const getClassification = (result, catCode, unknownText = "UNKNOWN") => {
  if (!result || !result.categoryBreakdown) return unknownText;

  const cleanCode = String(catCode)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  for (const [key, val] of Object.entries(result.categoryBreakdown)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanKey === cleanCode || cleanKey.includes(cleanCode)) {
      return val.categoricalValue || unknownText;
    }
  }

  return unknownText;
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
  const impactClassification = getClassification(
    totalRiskResult,
    "IMPACT",
    unknownText
  );
  const controlsClassification = getClassification(
    totalRiskResult,
    "CONTROLS",
    unknownText
  );
  const likelihoodClassification = getClassification(
    totalRiskResult,
    "LIKELIHOOD",
    unknownText
  );

  const backendThreshold = totalRiskResult.threshold;
  const contextRiskValue = totalRiskResult.contextRisk?.numericValue;
  const finalRiskValue = totalRiskResult.finalRisk?.numericValue;

  const getDisplayThreshold = () => {
    let val = isThresholdOverwritten ? manualRiskThreshold : backendThreshold;
    if (val === null || val === undefined || val === "") return "";
    return (val * 100).toFixed(2).replace(/\.00$/, "");
  };

  return (
    <RABox display="flex" flexDirection="column" gap={1}>
      {/* 1. Overall Risk Section */}
      <RABox
        p={2}
        sx={{
          borderRadius: 2,
          border: ({ palette }) => `1px solid ${palette.light.main}`,
          bgcolor: ({ palette }) =>
            palette.background.card || palette.background.default,
        }}
      >
        <RATypography variant="h6" textAlign="left" mb={1}>
          <strong>
            {t("report.summary.overallRiskTitle", "Overall risk")}
          </strong>
        </RATypography>

        {/* Line 1: Impact and Threshold */}
        <RATypography variant="body2" component="div">
          {t("report.summary.assessedLevelFor", "The assessed level for")}{" "}
          <strong>{t("report.summary.impactName", "Impact")}</strong>{" "}
          {t("report.summary.is", "is")}{" "}
          {renderStaticClassification(impactClassification, false)}{" "}
          <RATypography variant="body2" component="span">
            {t("report.summary.andRecommendedThreshold", "and the recommended")}{" "}
            <strong>
              {t(
                "report.summary.reidThresholdTarget",
                "re-identification risk threshold"
              )}
            </strong>{" "}
            {t("report.summary.is", "is")}{" "}
            {renderRiskPercentage(backendThreshold)}
          </RATypography>
        </RATypography>

        {/* Line 2: Manual Threshold Override */}
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
              value={getDisplayThreshold()}
              onCommit={(v) => {
                const decimalValue = v === "" ? "" : Number(v) / 100;
                if (onManualThresholdChange)
                  onManualThresholdChange(decimalValue);

                if (onThresholdOverwriteChange) {
                  onThresholdOverwriteChange(
                    v !== "" && v !== null && v !== undefined
                  );
                }
              }}
              fullWidth
              sx={({ palette }) => ({
                bgcolor: palette.background.default,
                "& .MuiOutlinedInput-root": { height: 40 },
              })}
            />
          </RABox>
        </RABox>
      </RABox>

      {/* 2. Context Risk Section */}
      <RABox
        p={2}
        sx={{
          borderRadius: 2,
          border: ({ palette }) => `1px solid ${palette.light.main}`,
          bgcolor: ({ palette }) =>
            palette.background.card || palette.background.default,
        }}
      >
        <RATypography variant="h6" textAlign="left" mb={1}>
          <strong>
            {t("report.summary.contextRiskTitle", "Context risk")}
          </strong>
        </RATypography>

        <RATypography variant="body2" component="div" mb={1}>
          {t("report.summary.assessedLevelFor", "The assessed level for")}{" "}
          <strong>{t("report.summary.controlsName", "Controls")}</strong>{" "}
          {t("report.summary.is", "is")}{" "}
          {renderStaticClassification(controlsClassification, true)}{" "}
          <RATypography variant="body2" component="span">
            {t("report.summary.andThe", "and the")}{" "}
            <strong>{t("report.summary.likelihoodName", "Likelihood")}</strong>{" "}
            {t("report.summary.is", "is")}{" "}
            {renderStaticClassification(likelihoodClassification, false)}
          </RATypography>
        </RATypography>

        <RATypography variant="body2" mt={2} component="div">
          {t("report.summary.derivedProbability", "The derived")}{" "}
          <strong>
            {t("report.summary.probabilityOfAttack", "probability of attack")}
          </strong>{" "}
          {t("report.summary.forGivenContext", "for the given context is")}{" "}
          {renderRiskPercentage(contextRiskValue)}
        </RATypography>
      </RABox>

      {/* 3. Data Risk Section */}
      <RABox
        p={2}
        sx={{
          borderRadius: 2,
          border: ({ palette }) => `1px solid ${palette.light.main}`,
          bgcolor: ({ palette }) =>
            palette.background.card || palette.background.default,
        }}
      >
        <RATypography variant="h6" textAlign="left" mb={1} color="dark">
          <strong>{t("report.summary.dataRiskTitle", "Data risk")}</strong>
        </RATypography>

        <RATypography variant="body2">
          {t("report.summary.theRecommended", "The recommended")}{" "}
          <strong>
            {t(
              "report.summary.riskThresholdAnon",
              "risk threshold for anonymization"
            )}
          </strong>{" "}
          {t("report.summary.is", "is")} {renderRiskPercentage(finalRiskValue)}
        </RATypography>
      </RABox>
    </RABox>
  );
}
