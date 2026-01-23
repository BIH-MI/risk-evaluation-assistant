import React from "react";
import { LinearProgress } from "@mui/material";
import RABox from "../../layout/RABox";
import RATypography from "../RATypography";


/**
 * A flexible bar chart component that handles RoE, Category, and Target Re-ID styles.
 * Supports color inversion for "Protection" metrics (where High Score = Good).
 *
 * @param {number} value - The primary value (0-100).
 * @param {Array} riskBands - Array of threshold objects.
 * @param {boolean} invert - If true, gradient runs Red -> Green (for Protection). Default False (Green -> Red).
 * @param {string|number} width - CSS width.
 */
const RABarChart = ({
                      value = "",
                      riskBands = [],
                      invert = false,
                      width = "100%"
                    }) => {
  // STYLES & GRADIENTS
  const barHeight = 20;
  const borderRadius = 6;

  // 1. Risk Gradient (Standard): Low(Green) -> Med(Yellow) -> High(Orange) -> Max(Red)
  const riskGradient = "linear-gradient(to right, #4caf50 0%, #4caf50 20%, #ff9800 60%, #f44336 80%, #d32f2f 100%)";

  // 2. Protection Gradient (Inverted): None(Red) -> Low(Orange) -> Med(Yellow) -> High(Green)
  const protectionGradient = "linear-gradient(to right, #d32f2f 0%, #f44336 20%, #ff9800 60%, #4caf50 80%, #2e7d32 100%)";

  const activeGradient = invert ? protectionGradient : riskGradient;

  // THRESHOLD CONFIGURATION
  const activeThresholdLines = riskBands
    .filter((t) => t.category === "CATEGORY_RISK" && t.rangeMaximum < 100)
    .sort((a, b) => a.rangeMaximum - b.rangeMaximum);

  const labelThresholds = riskBands
    .filter((t) => t.category === "CATEGORY_RISK")
    .sort((a, b) => a.rangeMaximum - b.rangeMaximum);

  // VALUE RESOLUTION (String -> Midpoint %)
  const resolvePosition = (val) => {
    if (!val || typeof val !== "string") return 0;

    const searchVal = val.toUpperCase();

    // --- FIX: Handle Aliases ---
    // Map "NONE" to the lowest bucket (usually "LOW" in thresholds)
    // Map "MAXIMAL" to the highest bucket (usually "MAX" in thresholds)
    let targetLabel = searchVal;
    if (searchVal === "NONE") targetLabel = "LOW";
    if (searchVal === "MAXIMAL") targetLabel = "MAX";

    // 1. Find Match
    let match = labelThresholds.find(t => t.label.toUpperCase() === targetLabel);

    // 2. Partial Match Fallback
    if (!match) {
      match = labelThresholds.find(t => t.label.toUpperCase().includes(targetLabel));
    }

    if (match) {
      let min = match.rangeMinimum;
      let max = match.rangeMaximum;

      // Handle decimals (0.2) vs percentages (20)
      if (min <= 1) min *= 100;
      if (max <= 1) max *= 100;

      // Return visual center
      return (min + max) / 2;
    }

    // Default to 0 if absolutely no match found
    return 0;
  };

  const primaryPos = resolvePosition(value);

  return (
    <RABox
      position="relative"
      width={width}
      mx="auto"
      display="flex"
      flexDirection="column"
      alignItems="center"
      mb={3}
      mt={3}
    >
      {/* --- Threshold Lines --- */}
      {activeThresholdLines.map((t) => {
        let rawPos = t.rangeMaximum;
        if (rawPos <= 1.0) rawPos = rawPos * 100;
        if (rawPos >= 100) return null;

        return (
          <RABox
            key={t.id || t.label}
            sx={{
              position: "absolute",
              left: `${rawPos}%`,
              top: 0,
              bottom: 0,
              width: "4px",
              backgroundColor: "#FFFFFF",
              zIndex: 1,
            }}
          />
        );
      })}

      {/* --- The Bar --- */}
      <LinearProgress
        variant="determinate"
        value={100}
        sx={{
          width: "100%",
          height: barHeight,
          borderRadius: borderRadius,
          zIndex: 0,
          "& .MuiLinearProgress-bar": {
            height: barHeight,
            borderRadius: borderRadius,
            backgroundImage: activeGradient,
          },
          "& .MuiLinearProgress-track": {
            borderRadius: borderRadius,
          },
        }}
      />

      {/* --- MARKER --- */}
      <RABox
        sx={{
          position: "absolute",
          top: -24,
          left: `${primaryPos}%`,
          transform: "translateX(-50%)",
          zIndex: 3,
          display: "flex", flexDirection: "column", alignItems: "center",
          transition: "left 0.3s ease"
        }}
      >
        <svg width="24" height="30" viewBox="0 0 24 24" fill="#555555" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </RABox>
      <RABox
        sx={{
          position: "absolute",
          top: barHeight / 2,
          left: `${primaryPos}%`,
          transform: "translate(-50%, -50%)",
          width: 10, height: 10, borderRadius: "50%", backgroundColor: "#555555", opacity: 0.9, zIndex: 3,
          transition: "left 0.3s ease"
        }}
      />

      {/* --- LABELS --- */}
      {labelThresholds.map((t) => {
        const min = t.rangeMinimum > 1 ? t.rangeMinimum : t.rangeMinimum * 100;
        const max = t.rangeMaximum > 1 ? t.rangeMaximum : t.rangeMaximum * 100;
        const midPoint = (min + max) / 2;
        const text = t.label.split(" ")[0];

        return (
          <RATypography
            key={t.id || t.label}
            variant="body2"
            sx={{
              position: "absolute",
              top: "100%",
              left: `${midPoint}%`,
              transform: "translateX(-50%)",
              mt: 0.5,
              fontWeight: "bold",
              color: "text.secondary",
              fontSize: "0.75rem",
              width: "120px",
              textAlign: "center",
            }}
          >
            {text}
          </RATypography>
        );
      })}
    </RABox>
  );
};

export default RABarChart;