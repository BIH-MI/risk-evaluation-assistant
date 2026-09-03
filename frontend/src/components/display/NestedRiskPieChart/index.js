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
import { RISK_CHART_COLORS } from "utils/riskChartColors";

const formatPercentage = (percentage) => {
  if (!Number.isFinite(percentage)) return "0%";
  if (percentage > 0 && percentage < 1) return "<1%";
  return `${Math.round(percentage)}%`;
};

// Calculates the center point of the specific donut slice to align labels inside it.
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  payload,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const label = formatPercentage(payload.percentage);

  if (!payload.isTrigger) {
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight="bold"
        style={{
          pointerEvents: "none",
          textShadow: "0 1px 3px rgba(0,0,0,0.45)",
        }}
      >
        {label}
      </text>
    );
  }

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontWeight="bold"
      style={{
        pointerEvents: "none",
        textShadow: "0 1px 3px rgba(0,0,0,0.45)",
      }}
    >
      <tspan x={x} dy="-0.25em" fontSize={16}>
        {payload.shortLabel}
      </tspan>
      <tspan x={x} dy="1.25em" fontSize={12}>
        {label}
      </tspan>
    </text>
  );
};

export default function NestedRiskPieChart({ categoryData }) {
  const { t } = useTranslation();

  const pieData = useMemo(() => {
    if (!categoryData) return [];

    const {
      positiveCount = 0,
      neutralCount = 0,
      negativeCount = 0,
      highRiskCount = 0,
      isHighRiskTriggered = false,
    } = categoryData;

    const data = [
      {
        name: t("report.factors.positive", "Positive Impact"),
        value: positiveCount,
        color: RISK_CHART_COLORS.positive,
      },
      {
        name: t("report.factors.neutral", "Neutral Impact"),
        value: neutralCount,
        color: RISK_CHART_COLORS.neutral,
      },
      {
        name: t("report.factors.negative", "Negative Impact"),
        value: negativeCount,
        color: RISK_CHART_COLORS.negative,
      },
    ];

    const triggerSize =
      highRiskCount > 0 ? highRiskCount : isHighRiskTriggered ? 1 : 0;

    if (triggerSize > 0) {
      data.push({
        name: t("report.factors.highRiskTrigger", "High Risk Triggered"),
        value: triggerSize,
        color: RISK_CHART_COLORS.highRiskTrigger,
        shortLabel: "⚠️",
        isTrigger: true,
      });
    }

    const filteredData = data.filter((d) => d.value > 0);
    const total = filteredData.reduce((sum, item) => sum + item.value, 0);

    return filteredData.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }));
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
          <RATypography variant="caption" display="block">
            Percentage: {formatPercentage(data.percentage)}
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
