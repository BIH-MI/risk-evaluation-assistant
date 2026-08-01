import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import RABox from "../../../components/layout/RABox";
import RATypography from "../RATypography";

// Calculates the center point of the specific donut slice to perfectly align the icon
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  payload,
}) => {
  if (payload.isTrigger) {
    const RADIAN = Math.PI / 180;
    // Calculate the midpoint between the inner and outer radius
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;

    // Use trigonometry to find the X and Y coordinates on the circle
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={18}
        fontWeight="bold"
        style={{ pointerEvents: "none" }}
      >
        {payload.shortLabel}
      </text>
    );
  }
  return null;
};

export default function NestedRiskPieChart({ categoryData }) {
  const { t } = useTranslation();

  const pieData = useMemo(() => {
    if (!categoryData) return [];

    const {
      positiveCount = 0,
      neutralCount = 0,
      negativeCount = 0,
      highRiskCount = 0, // Brought in from the updated backend
      isHighRiskTriggered = false,
    } = categoryData;

    // Single Ring: Maps the actual counts + the High Risk Trigger
    const data = [
      {
        name: t("report.factors.positive", "Positive Impact"),
        value: positiveCount,
        color: "#4CAF50", // Green
      },
      {
        name: t("report.factors.neutral", "Neutral Impact"),
        value: neutralCount,
        color: "#9E9E9E", // Grey
      },
      {
        name: t("report.factors.negative", "Negative Impact"),
        value: negativeCount,
        color: "#F44336", // Red
      },
    ];

    // Add High Risk Trigger as a distinct category in the ring
    // We use highRiskCount from the backend if available, otherwise default to 1 if triggered
    const triggerSize =
      highRiskCount > 0 ? highRiskCount : isHighRiskTriggered ? 1 : 0;

    if (triggerSize > 0) {
      data.push({
        name: t("report.factors.highRiskTrigger", "High Risk Triggered"),
        value: triggerSize,
        color: "#b71c1c", // Dark Red to distinguish from standard negative
        shortLabel: "⚠️",
        isTrigger: true,
      });
    }

    return data.filter((d) => d.value > 0);
  }, [categoryData, t]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <RABox
          p={1.5}
          border="1px solid #ccc"
          borderRadius="8px"
          sx={{
            zIndex: 9999,
            backgroundColor: "#ffffff",
            opacity: 1,
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          <RATypography variant="caption" fontWeight="bold" display="block">
            {data.name}
          </RATypography>
          <RATypography variant="caption" display="block" mt={0.5}>
            Count: {data.value}
          </RATypography>
        </RABox>
      );
    }
    return null;
  };

  if (pieData.length === 0) {
    return (
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
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        {/* SINGLE RING: Positive / Neutral / Negative / High Risk Triggers */}
        <Pie
          data={pieData}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={90}
          stroke="#fff"
          label={renderCustomLabel}
          labelLine={false}
          isAnimationActive={false}
        >
          {pieData.map((entry, index) => (
            <Cell key={`pie-${index}`} fill={entry.color} />
          ))}
        </Pie>

        <RechartsTooltip
          content={<CustomTooltip />}
          wrapperStyle={{ zIndex: 1000 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
