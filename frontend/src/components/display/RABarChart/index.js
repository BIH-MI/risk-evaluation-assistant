import React from "react";
import RABox from "../../layout/RABox";
import RATypography from "../RATypography";

/**
 * A flexible bar chart component that handles dynamic Category risk bands.
 * Supports color inversion for "Protection" metrics (where High Score = Good).
 */
const RABarChart = ({
  value = "",
  riskBands = [],
  invert = false,
  category = "",
  width = "100%",
  highRiskTriggered = false,
}) => {
  const barHeight = 20;
  const borderRadius = 6;

  let categoryBands = [...riskBands];

  categoryBands.sort(
    (a, b) => (Number(a.rangeMinimum) || 0) - (Number(b.rangeMinimum) || 0)
  );

  const N = categoryBands.length || 1;
  const segmentWidth = 100 / N;

  const cleanStr = (s) =>
    String(s)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  let targetLabel = cleanStr(value);

  if (targetLabel === "MAXIMAL") targetLabel = "MAX";

  const activeIndex = categoryBands.findIndex((b) => {
    const lbl = cleanStr(b.label);
    return (
      lbl === targetLabel ||
      lbl.includes(targetLabel) ||
      targetLabel.includes(lbl)
    );
  });

  let primaryPos = 0;
  if (activeIndex !== -1) {
    primaryPos = activeIndex * segmentWidth + segmentWidth / 2;
  }

  const standardColors = [
    "#4caf50",
    "#8bc34a",
    "#ff9800",
    "#f44336",
    "#d32f2f",
    "#b71c1c",
  ];
  let activeColors = standardColors.slice(0, N);

  while (activeColors.length < N) {
    activeColors.push(standardColors[standardColors.length - 1]);
  }

  if (invert) {
    activeColors = [...activeColors].reverse();
  }

  let gradientParts = [];
  activeColors.forEach((color, i) => {
    gradientParts.push(`${color} ${i * segmentWidth}%`);
    gradientParts.push(`${color} ${(i + 1) * segmentWidth}%`);
  });
  const background = `linear-gradient(to right, ${gradientParts.join(", ")})`;

  return (
    <RABox sx={{ width, mt: 3, mb: 0 }}>
      <RABox sx={{ position: "relative", width: "100%", height: barHeight }}>
        <RABox
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: `${borderRadius}px`,
            background: categoryBands.length > 0 ? background : "#e0e0e0",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }}
        />

        {activeIndex !== -1 && categoryBands.length > 0 && (
          <>
            <RABox
              sx={{
                position: "absolute",
                top: -24,
                left: `${primaryPos}%`,
                transform: "translateX(-50%)",
                zIndex: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transition: "left 0.3s ease",
              }}
            >
              <svg
                width="24"
                height="30"
                viewBox="0 0 24 24"
                fill={highRiskTriggered ? "#780000" : "#555555"}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </RABox>
            <RABox
              sx={{
                position: "absolute",
                top: barHeight / 2,
                left: `${primaryPos}%`,
                transform: "translate(-50%, -50%)",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: highRiskTriggered ? "#780000" : "#333333",
                zIndex: 3,
                transition: "left 0.3s ease",
              }}
            />
          </>
        )}
      </RABox>

      {categoryBands.length > 0 && (
        <RABox sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          {categoryBands.map((b, i) => (
            <RABox
              key={i}
              sx={{ width: `${segmentWidth}%`, textAlign: "center" }}
            >
              <RATypography
                variant="caption"
                sx={{
                  display: "block",
                  color:
                    highRiskTriggered && activeIndex === i ? "#780000" : "#666",
                  fontWeight: activeIndex === i ? "bold" : "normal",
                  fontSize: "0.7rem",
                  lineHeight: 1.2,
                }}
              >
                {b.label}
              </RATypography>
            </RABox>
          ))}
        </RABox>
      )}
    </RABox>
  );
};

export default RABarChart;
