import React from "react";
import { Grid } from "@mui/material";
import { useTranslation } from "react-i18next";
import RABox from "../../components/layout/RABox";
import RATypography from "../../components/display/RATypography";
import NestedRiskPieChart from "../../components/display/NestedRiskPieChart";
import RABarChart from "../../components/display/RABarChart";

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

export default function RiskFactors({ totalRiskResult, dsConfig, rcConfig }) {
  const { t } = useTranslation();

  if (!totalRiskResult || !totalRiskResult.categoryBreakdown) {
    return null;
  }

  // Strictly route Dataset Assessment categories to dsConfig
  // and Recipient Assessment categories to rcConfig to prevent overlapping bands.
  const getCategoryConfig = (catCode) => {
    const isDatasetCategory = ["IMPACT", "DATA_RISK", "IP"].includes(
      catCode.toUpperCase()
    );
    const targetConfig = isDatasetCategory ? dsConfig : rcConfig;

    if (targetConfig && targetConfig.categories) {
      return targetConfig.categories.find(
        (c) => c.code.toUpperCase() === catCode.toUpperCase()
      );
    }
    return null;
  };

  const renderCategory = (catCode, categoryData) => {
    const resultClass =
      categoryData.categoricalValue || t("report.factors.unknown", "UNKNOWN");

    const categoryConfig = getCategoryConfig(catCode);
    const categoryBands = categoryConfig?.riskBands || [];

    // Pull the exact name from the config, or fallback to capitalized code
    const categoryName =
      categoryConfig?.name ||
      catCode.charAt(0).toUpperCase() + catCode.slice(1).toLowerCase();

    const isHighRiskTriggered = categoryData.isHighRiskTriggered || false;

    // Use the true riskEffect from the database, fallback to code check
    const isProtective =
      categoryConfig?.riskEffect === "DECREASES_RISK" ||
      catCode.toUpperCase() === "CONTROLS";

    const hasData =
      categoryData.positiveCount > 0 ||
      categoryData.neutralCount > 0 ||
      categoryData.negativeCount > 0;

    return (
      <Grid item xs={12} md={4} key={catCode}>
        <RABox
          p={3}
          height="100%"
          display="flex"
          flexDirection="column"
          gap={1}
          sx={({ palette, boxShadows }) => ({
            border: `1px solid ${palette.light.main}`,
            borderRadius: "8px",
            bgcolor: palette.background.card || palette.background.default,
            boxShadow: boxShadows.sm,
          })}
        >
          <RABox display="flex" justifyContent="center" alignItems="center">
            <RATypography
              variant="h6"
              fontWeight="bold"
            >
              {categoryName}
            </RATypography>
          </RABox>

          <RABox px={1}>
            {categoryBands.length > 0 ? (
              <RABarChart
                value={resultClass}
                riskBands={categoryBands}
                invert={isProtective}
                category={catCode}
                highRiskTriggered={isHighRiskTriggered}
              />
            ) : (
              <RATypography
                variant="caption"
                display="block"
                mt={1}
                color="error"
              >
                {t(
                  "report.factors.noBands",
                  "No risk bands defined for this category."
                )}
              </RATypography>
            )}
          </RABox>

          <RABox flexGrow={1} minHeight={195} position="relative">
            {hasData || isHighRiskTriggered ? (
              <NestedRiskPieChart categoryData={categoryData} />
            ) : (
              <RABox
                height="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <RATypography variant="caption" color="text">
                  {t("report.factors.noData", "No data available")}
                </RATypography>
              </RABox>
            )}
          </RABox>
        </RABox>
      </Grid>
    );
  };

  return (
    <RABox>
      {/* 1. Pie Charts Grid */}
      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {Object.entries(totalRiskResult.categoryBreakdown).map(([code, data]) =>
          renderCategory(code, data)
        )}
      </Grid>

      {/* 2. Universal Legend (Placed Below the Charts) */}
      <RABox
        display="flex"
        justifyContent="center"
        gap={3}
        mt={4}
        mb={2}
        flexWrap="wrap"
      >
        <RABox display="flex" alignItems="center" gap={1}>
          <RABox width={14} height={14} borderRadius="2px" bgColor="#4CAF50" />
          <RATypography variant="caption" fontWeight="medium">
            {t("report.factors.positive", "Positive Impact")}
          </RATypography>
        </RABox>
        <RABox display="flex" alignItems="center" gap={1}>
          <RABox width={14} height={14} borderRadius="2px" bgColor="#9E9E9E" />
          <RATypography variant="caption" fontWeight="medium">
            {t("report.factors.neutral", "Neutral Impact")}
          </RATypography>
        </RABox>
        <RABox display="flex" alignItems="center" gap={1}>
          <RABox width={14} height={14} borderRadius="2px" bgColor="#F44336" />
          <RATypography variant="caption" fontWeight="medium">
            {t("report.factors.negative", "Negative Impact")}
          </RATypography>
        </RABox>
        <RABox display="flex" alignItems="center" gap={1}>
          <RABox width={14} height={14} borderRadius="2px" bgColor="#b71c1c" />
          <RATypography variant="caption" fontWeight="medium">
            {t("report.factors.highRiskTrigger", "High Risk Trigger")} (⚠️)
          </RATypography>
        </RABox>
      </RABox>
    </RABox>
  );
}
