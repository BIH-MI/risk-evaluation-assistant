import React from "react";
import { alpha } from "@mui/material/styles";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export const getEvidenceTooltipSurfaceColor = (theme) =>
  theme.palette.mode === "dark"
    ? theme.palette.background.card || theme.palette.grey[900]
    : theme.palette.grey[900];

export const getEvidenceTooltipTextColor = (theme) =>
  theme.palette.white?.main || theme.palette.common?.white || "#fff";

export const evidenceTooltipComponentsProps = {
  tooltip: {
    sx: (theme) => {
      const textColor = getEvidenceTooltipTextColor(theme);

      return {
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

export function EvidenceTooltipContainer({ children, width = 320 }) {
  return (
    <RABox
      sx={(theme) => ({
        width: `${width}px`,
        maxWidth: "min(380px, 80vw)",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        textAlign: "left",
        alignItems: "stretch",
        minWidth: 0,
        "& .evidence-section + .evidence-section": {
          borderTop: `1px solid ${alpha(
            getEvidenceTooltipTextColor(theme),
            0.16
          )}`,
          pt: 1.25,
        },
      })}
    >
      {children}
    </RABox>
  );
}

export function EvidenceSection({ title, children }) {
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
        color="white"
        fontWeight="bold"
        display="block"
        sx={{
          fontSize: "0.75rem",
          lineHeight: 1.25,
          letterSpacing: 0,
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
        color="white"
        display="block"
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          lineHeight: 1.35,
          opacity: 0.72,
          overflowWrap: "anywhere",
        }}
      >
        {label}
      </RATypography>
      <RATypography
        variant="caption"
        color="white"
        fontWeight="medium"
        display="block"
        sx={{
          flex: "0 1 60%",
          minWidth: 0,
          lineHeight: 1.35,
          textAlign: "right",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </RATypography>
    </RABox>
  );
}

export function EvidenceDivider({ sx = {} }) {
  return (
    <RABox
      sx={(theme) => ({
        borderTop: `1px solid ${alpha(
          getEvidenceTooltipTextColor(theme),
          0.16
        )}`,
        my: 0.75,
        ...sx,
      })}
    />
  );
}

export function EvidenceLine({ children }) {
  return (
    <RATypography
      variant="caption"
      color="white"
      display="block"
      sx={{
        lineHeight: 1.35,
        opacity: 0.82,
        overflowWrap: "anywhere",
        whiteSpace: "normal",
      }}
    >
      {children}
    </RATypography>
  );
}
