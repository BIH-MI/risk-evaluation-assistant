import React from "react";
import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import OnBlurRAInput from "../../../components/input/RAInput/OnBlurRAInput";
import colors from "../../../assets/theme/base/colors";

// Helper: Determine text color based on Classification and Type
const getClassificationColor = (classification, type) => {
  const cls = (classification || "").toUpperCase();
  const isProtection = type === "MITC";

  if (isProtection) {
    // PROTECTION Logic
    switch (cls) {
      case "MAX":
      case "MAXIMAL":
      case "HIGH":
        return colors.success.main; // Green
      case "MEDIUM":
        return colors.warning.main; // Orange
      case "LOW":
      case "NONE":
      default:
        return colors.error.main;   // Red
    }
  } else {
    // RISK Logic
    switch (cls) {
      case "MAX":
      case "MAXIMAL":
      case "HIGH":
        return colors.error.main;   // Red
      case "MEDIUM":
        return colors.warning.main; // Orange
      case "LOW":
      case "NONE":
      default:
        return colors.success.main; // Green
    }
  }
};

/**
 * Renders the static classification text with appropriate coloring.
 * Formats text to Title Case (e.g. "Low", "Medium").
 */
const renderStaticClassification = (classification, type) => {
  const text = classification || "UNKNOWN";
  const color = getClassificationColor(text, type);

  // Convert to Title Case: "LOW" -> "Low"
  const displayText = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

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
 * Removed comparison logic (default vs final).
 */
const renderRiskPercentage = (val) => {
  const str = val !== null && val !== undefined ? (val * 100).toFixed(2) + "%" : "—";

  return (
    <RATypography variant="body2" component="span" fontWeight="bold" ml={1} color="inherit">
      {str}
    </RATypography>
  );
};

export default function RiskAnalysisSummary({
                                              totalRiskResult,
                                              manualRiskThreshold,
                                              onManualThresholdChange,
                                              isThresholdOverwritten,
                                              onThresholdOverwriteChange
                                            }) {
  if (!totalRiskResult) return null;

  // Helper to calculate display value (0.05 -> 5)
  const getDisplayThreshold = () => {
    let val = isThresholdOverwritten ? manualRiskThreshold : totalRiskResult?.ipThreshold;
    if (val === null || val === undefined || val === "") return "";
    // Convert decimal to percentage for display
    return (val * 100).toFixed(2).replace(/\.00$/, "");
  };

  return (
    <RABox display="flex" flexDirection="column" gap={1}>

      {/* 1. Overall Risk Section */}
      <RABox
        p={2}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e0e0"
        }}
      >
        <RATypography variant="h6" textAlign="left" mb={1}>
          <strong>Overall risk</strong>
        </RATypography>

        {/* Line 1: Invasion of Privacy */}
        <RATypography variant="body2" component="div">
          The level of <strong>invasion of privacy</strong> is

          {renderStaticClassification(
            totalRiskResult.invasionPrivacyClassification,
            "IP"
          )}

          <RATypography variant="body2" component="span" ml={0.5}>
            and the recommended <strong>re-identification risk threshold</strong> is
            {renderRiskPercentage(totalRiskResult.ipThreshold)}
          </RATypography>
        </RATypography>

        {/*Line 3: Manual Threshold Override */}
        <RABox display="flex" alignItems="center" flexWrap="wrap" mt={3}>
          <RATypography variant="body2" component="span" mr={2}>
            You can define a <strong>target risk re-identification threshold</strong>
          </RATypography>

          <RABox width={102} display="inline-block">
            <OnBlurRAInput
              label="Threshold (%)"
              placeholder="5"
              type="number"
              disabled={false}
              // Display value in % (e.g., 5 for 0.05)
              value={getDisplayThreshold()}
              onCommit={(v) => {
                // Convert % back to decimal (e.g., 5 -> 0.05)
                const decimalValue = v === "" ? "" : Number(v) / 100;

                if (onManualThresholdChange) onManualThresholdChange(decimalValue);

                if (onThresholdOverwriteChange) {
                  onThresholdOverwriteChange(v !== "" && v !== null && v !== undefined);
                }
              }}
              fullWidth
              sx={{ bgcolor: "white", "& .MuiOutlinedInput-root": { height: 40 } }}
            />
          </RABox>
        </RABox>
      </RABox>

      {/* 2. Context Risk Section */}
      <RABox
        p={2}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e0e0"
        }}
      >
        <RATypography variant="h6" textAlign="left" mb={1}>
          <strong>Context risk</strong>
        </RATypography>

        <RATypography variant="body2" component="div" mb={1}>
          The <strong>level of protection</strong> provided by <strong>mitigating controls</strong> is

          {renderStaticClassification(
            totalRiskResult.mitigatingControlsClassification,
            "MITC"
          )}

          <RATypography variant="body2" component="span" ml={0.5}>
            and the <strong>threat level</strong> posed by <strong>motives & capacity</strong> is
          </RATypography>

          {renderStaticClassification(
            totalRiskResult.motivesCapacityClassification,
            "MOTC"
          )}
        </RATypography>

        <RATypography variant="body2" mt={2}>
          The derived <strong>probability of attack</strong> for the given context is
          {renderRiskPercentage(totalRiskResult.contextRisk)}
        </RATypography>
      </RABox>

      {/* 3. Data Risk Section */}
      <RABox
        p={2}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e0e0"
        }}
      >
        <RATypography variant="h6" textAlign="left" mb={1} color="dark">
          <strong>Data risk</strong>
        </RATypography>

        <RATypography variant="body2">
          The recommended <strong>risk threshold for anonymization</strong> is

          {renderRiskPercentage(totalRiskResult.maximumDataRisk)}
        </RATypography>
      </RABox>
    </RABox>
  );
}