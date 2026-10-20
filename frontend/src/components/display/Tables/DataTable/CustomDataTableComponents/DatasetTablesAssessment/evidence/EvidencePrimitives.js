import React from "react";
import { alpha } from "@mui/material/styles";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

const getEvidenceTooltipSurfaceColor = (theme) =>
  theme.palette.mode === "dark"
    ? theme.palette.background.card || theme.palette.grey[900]
    : theme.palette.grey[900];

const getEvidenceTooltipTextColor = (theme) =>
  theme.palette.white?.main || theme.palette.common?.white || "#fff";

export const evidenceTooltipComponentsProps = {
  tooltip: {
    sx: (theme) => {
      const textColor = getEvidenceTooltipTextColor(theme);

      return {
        "--evidence-divider": alpha(textColor, 0.2),
        "--evidence-muted": alpha(textColor, 0.88),
        "--evidence-heading": textColor,
        "--evidence-value": "#F8FAFC",
        maxWidth: "min(380px, 80vw)",
        bgcolor: getEvidenceTooltipSurfaceColor(theme),
        color: textColor,
        border: `1px solid ${alpha(textColor, 0.18)}`,
        borderRadius: "10px",
        p: "10px 12px",
        boxShadow: theme.shadows?.[8] || "0 10px 30px rgba(0, 0, 0, 0.3)",
        opacity: 1,
        textAlign: "left",
      };
    },
  },
  arrow: {
    sx: (theme) => ({
      color: getEvidenceTooltipSurfaceColor(theme),
    }),
  },
};

// Light, print-friendly surface for ?paperScreenshot=1 (dark text on white).
export const evidenceTooltipLightComponentsProps = {
  tooltip: {
    sx: {
      "--evidence-divider": "#d9dee5",
      "--evidence-muted": "#374151",
      "--evidence-heading": "#0f172a",
      "--evidence-value": "#111827",
      maxWidth: "min(380px, 80vw)",
      bgcolor: "#ffffff",
      color: "#111827",
      border: "1px solid #c3cad3",
      borderRadius: "8px",
      p: "10px 12px",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
      opacity: 1,
      textAlign: "left",
    },
  },
  arrow: {
    sx: {
      color: "#ffffff",
      "&::before": { border: "1px solid #c3cad3" },
    },
  },
};

export function EvidenceTooltipContainer({ children, width = 320 }) {
  return (
    <RABox
      sx={{
        width: `${width}px`,
        maxWidth: "min(380px, 80vw)",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        textAlign: "left",
        alignItems: "stretch",
        minWidth: 0,
        "& .evidence-section + .evidence-section": {
          borderTop: "1px solid var(--evidence-divider, rgba(255, 255, 255, 0.16))",
          pt: 1.25,
        },
      }}
    >
      {children}
    </RABox>
  );
}

export function EvidenceSection({ title, centerTitle = false, children }) {
  return (
    <RABox
      component="section"
      className="evidence-section"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        minWidth: 0,
      }}
    >
      <RATypography
        variant="caption"
        color="inherit"
        fontWeight="bold"
        display="block"
        sx={{
          fontSize: "0.875rem",
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: "0.01em",
          color: "var(--evidence-heading, inherit)",
          textAlign: centerTitle ? "center" : "left",
          overflowWrap: "anywhere",
        }}
      >
        {title}
      </RATypography>
      <RABox
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          minWidth: 0,
        }}
      >
        {children}
      </RABox>
    </RABox>
  );
}

export function EvidenceMetricRow({ label, value }) {
  return (
    <RABox
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        width: "100%",
        minWidth: 0,
      }}
    >
      <RATypography
        variant="caption"
        color="inherit"
        display="block"
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          fontSize: "0.8125rem",
          lineHeight: 1.4,
          color: "var(--evidence-muted, inherit)",
          overflowWrap: "anywhere",
        }}
      >
        {label}
      </RATypography>
      <RATypography
        variant="caption"
        color="inherit"
        fontWeight="medium"
        display="block"
        sx={{
          flex: "0 1 60%",
          minWidth: 0,
          fontSize: "0.8125rem",
          fontWeight: 600,
          lineHeight: 1.4,
          textAlign: "right",
          // Explicit: RABox defaults to the theme's dark text colour.
          color: "var(--evidence-value, #F8FAFC)",
          // Aligned digits make values easy to compare across rows.
          fontVariantNumeric: "tabular-nums",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </RATypography>
    </RABox>
  );
}

export function EvidenceLine({ children }) {
  return (
    <RATypography
      variant="caption"
      color="inherit"
      display="block"
      sx={{
        fontSize: "0.78rem",
        lineHeight: 1.4,
        color: "var(--evidence-muted, inherit)",
        overflowWrap: "anywhere",
        whiteSpace: "normal",
      }}
    >
      {children}
    </RATypography>
  );
}
