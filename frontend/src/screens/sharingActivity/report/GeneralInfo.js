import React from "react";
import { Grid } from "@mui/material";
import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";

const InfoCard = ({ title, items }) => (
  <RABox
    elevation={0}
    sx={{
      p: 3,
      height: "100%",
      border: "1px solid #e0e0e0",
      borderRadius: 2,
      bgcolor: "white"
    }}
  >
    <RATypography
      variant="h5"
      fontWeight="bold"
      textAlign="center"
      mb={2}
    >
      {title}
    </RATypography>
    <RABox display="flex" flexDirection="column" gap={1.5}>
      {items.map((item, idx) => (
        <RABox key={idx}>
          <RATypography variant="subtitle2" fontWeight="bold">
            {item.label}
          </RATypography>
          <RATypography variant="body2">
            {item.value || "—"}
          </RATypography>
        </RABox>
      ))}
    </RABox>
  </RABox>
);

export default function GeneralInfo({ dsAssessment, rcAssessment }) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <InfoCard
          title="Dataset Information"
          items={[
            { label: "Name", value: dsAssessment?.datasetName },
            { label: "Description", value: dsAssessment?.description }
          ]}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <InfoCard
          title="Recipient Information"
          items={[
            { label: "Name", value: rcAssessment?.organization },
            { label: "Description", value: rcAssessment?.description }
          ]}
        />
      </Grid>
    </Grid>
  );
}