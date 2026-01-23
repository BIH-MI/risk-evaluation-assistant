import React, { useMemo } from "react";
import colors from "../../../assets/theme/base/colors";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Grid } from "@mui/material";
import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import RABarChart from "../../../components/display/RABarChart";

// Helper: Determine text color based on Classification and Type
const getClassificationColor = (classification, type) => {
  const cls = (classification || "").toUpperCase();
  const isProtection = type === "MITC";

  if (isProtection) {
    // PROTECTION Logic: High = Green, Low = Red
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
    // RISK Logic: High = Red, Low = Green
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

export default function RiskFactors({
                                      dsAssessment,
                                      rcAssessment,
                                      allQuestions,
                                      riskBands = [],
                                      contextRiskResult
                                    }) {
  const {
    ipClassification,
    mitcClassification,
    motcClassification
  } = contextRiskResult;

  // --- 1. DATA PREPARATION ---

  // IP Pie Data (Risk Category: Yes = Bad/Red)
  const invasionSummary = useMemo(() => {
    const answers = dsAssessment?.answers || [];
    return [
      {
        name: "Yes",
        value: answers.filter(a => a.answer === "YES").length,
        color: colors.error.main
      },
      {
        name: "No",
        value: answers.filter(a => a.answer === "NO").length,
        color: colors.success.main
      },
      {
        name: "Unknown",
        value: answers.filter(a => a.answer === "UNKNOWN").length,
        color: colors.grey[400]
      }
    ];
  }, [dsAssessment]);

  // Helper to build MOTC/MITC pie data
  const getPieDataForQuestions = (type) => {
    const questionIds = (allQuestions || [])
      .filter(q => q.type === type)
      .map(q => q.id);

    const filteredAnswers = (rcAssessment?.answers || [])
      .filter(a => questionIds.includes(a.questionId));

    const yes = filteredAnswers.filter(a => a.answer === "YES").length;
    const no  = filteredAnswers.filter(a => a.answer === "NO").length;
    const na  = filteredAnswers.filter(a => a.answer === "UNKNOWN").length;

    const isProtection = type === "MITC";

    // Determine Colors based on Type
    let colorYes, colorNo;

    if (isProtection) {
      // MITC: YES = Protection (Green), NO = Risk (Red)
      colorYes = colors.success.main;
      colorNo = colors.error.main;
    } else {
      // MOTC: YES = Risk (Red), NO = Safe (Green)
      colorYes = colors.error.main;
      colorNo = colors.success.main;
    }

    return [
      { name: "Yes",     value: yes, color: colorYes },
      { name: "No",      value: no,  color: colorNo },
      { name: "Unknown", value: na,  color: colors.grey[400] }
    ];
  };

  const mitcData = useMemo(() => getPieDataForQuestions("MITC"), [rcAssessment, allQuestions]);
  const motcData = useMemo(() => getPieDataForQuestions("MOTC"), [rcAssessment, allQuestions]);

  // --- 2. RENDERERS ---

  const labelMap = {
    IP:   "Invasion of Privacy",
    MITC: "Mitigating Controls",
    MOTC: "Motives & Capacity",
  };

  const renderCategory = (cat, data, categoryClassification) => {
    const totalValues = data.reduce((acc, curr) => acc + curr.value, 0);
    // Pass 'invert' to BarChart for MITC so the gradient is Red -> Green
    const isMitc = cat === "MITC";

    return (
      <Grid item xs={12} md={4} key={cat}>
        <RABox
          p={2}
          sx={{
            height: "100%",
            textAlign: "center"
            // Removed border: "1px solid #eee"
          }}
        >
          {/* Header */}
          <RATypography variant="h6" fontWeight="bold" mb={1}>
            {labelMap[cat]}
          </RATypography>

          {/* Removed Level Label Block */}

          {/* Bar Chart (Risk Meter) */}
          <RABox width="100%" px={2} mb={4}>
            <RABarChart
              value={categoryClassification}
              riskBands={riskBands}
              invert={isMitc}
              width="100%"
            />
          </RABox>

          {/* Pie Chart */}
          <RABox height="220px" width="100%">
            {totalValues > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (percent === 0) return null;
                      const RAD = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RAD);
                      const y = cy + radius * Math.sin(-midAngle * RAD);
                      return (
                        <text x={x} y={y} fill="black" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                          {`${(percent*100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"
                    iconType="circle"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: 16 }}
                    formatter={(val, entry) => <span style={{ color: entry.color, fontWeight: 500, fontSize: 14, marginRight: 16 }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <RABox height="100%" display="flex" alignItems="center" justifyContent="center">
                <RATypography variant="caption" color="text">No data available</RATypography>
              </RABox>
            )}
          </RABox>
        </RABox>
      </Grid>
    );
  };

  return (
    <RABox>
      <Grid container spacing={3}>
        {renderCategory("IP", invasionSummary, ipClassification)}
        {renderCategory("MITC", mitcData, mitcClassification)}
        {renderCategory("MOTC", motcData, motcClassification)}
      </Grid>
    </RABox>
  );
}