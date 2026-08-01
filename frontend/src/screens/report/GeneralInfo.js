import React from "react";
import { Grid } from "@mui/material";
import RABox from "../../components/layout/RABox";
import RATypography from "../../components/display/RATypography";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const InfoCard = ({ title, items }) => (
  <RABox
    elevation={0}
    sx={{
      p: 3,
      height: "100%",
      border: "1px solid #e0e0e0",
      borderRadius: 2,
      bgcolor: "white",
    }}
  >
    <RATypography variant="h5" fontWeight="bold" textAlign="center" mb={2}>
      {title}
    </RATypography>
    <RABox display="flex" flexDirection="column" gap={1.5}>
      {items.map((item, idx) => (
        <RABox key={idx}>
          <RATypography variant="subtitle2" fontWeight="bold">
            {item.label}
          </RATypography>
          {item.isLink && item.value && item.value !== "—" ? (
            <RATypography variant="body2">
              <Link
                to={item.linkTo}
                state={item.linkState}
                style={{
                  textDecoration: "underline",
                  color: "inherit",
                }}
              >
                {item.value}
              </Link>
            </RATypography>
          ) : (
            <RATypography variant="body2">{item.value || "—"}</RATypography>
          )}
        </RABox>
      ))}
    </RABox>
  </RABox>
);

export default function GeneralInfo({
  dsAssessment,
  rcAssessment,
  dsConfig,
  rcConfig,
}) {
  const { t } = useTranslation();

  return (
    <RABox>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <InfoCard
            title={t("report.general.datasetInfo", "Dataset Information")}
            items={[
              {
                label: t("report.general.name", "Name"),
                value: dsAssessment?.datasetName,
              },
              {
                label: t("report.general.description", "Description"),
                value: dsAssessment?.description,
              },
              {
                label: t("report.general.configuration", "Configuration"),
                value: dsConfig
                  ? `${dsConfig.name}`
                  : "—",
                isLink: true,
                linkTo: "/configurations",
                linkState: { configId: dsConfig?.id },
              },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoCard
            title={t("report.general.recipientInfo", "Recipient Information")}
            items={[
              {
                label: t("report.general.name", "Name"),
                value: rcAssessment?.organization,
              },
              {
                label: t("report.general.description", "Description"),
                value: rcAssessment?.description,
              },
              {
                label: t("report.general.configuration", "Configuration"),
                value: rcConfig
                  ? `${rcConfig.name}`
                  : "—",
                isLink: true,
                linkTo: "/configurations",
                linkState: { configId: rcConfig?.id },
              },
            ]}
          />
        </Grid>
      </Grid>
    </RABox>
  );
}
