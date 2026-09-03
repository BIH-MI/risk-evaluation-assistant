import { useMemo } from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatScoringSystemLabel } from "../reportDataUtils";

function buildDatasetInfoItems({
  datasetAssessment,
  datasetConfiguration,
  attributeScoringSystem,
  t,
}) {
  return [
    {
      key: "dataset-name",
      label: t("report.general.name", "Name"),
      value: datasetAssessment?.datasetName,
    },
    {
      key: "dataset-description",
      label: t("report.general.description", "Description"),
      value: datasetAssessment?.description,
    },
    {
      key: "dataset-configuration",
      label: t("report.general.configuration", "Configuration"),
      value: datasetConfiguration?.name || "—",
      isLink: Boolean(datasetConfiguration),
      linkTo: "/configurations",
      linkState: { configId: datasetConfiguration?.id },
    },
    {
      key: "attribute-scoring-system",
      label: t("report.general.attributeScoringSystem", "Scoring System"),
      value: attributeScoringSystem
        ? formatScoringSystemLabel(attributeScoringSystem)
        : "—",
    },
  ];
}

function buildRecipientInfoItems({
  recipientAssessment,
  recipientConfiguration,
  t,
}) {
  return [
    {
      key: "recipient-name",
      label: t("report.general.name", "Name"),
      value: recipientAssessment?.organization,
    },
    {
      key: "recipient-description",
      label: t("report.general.description", "Description"),
      value: recipientAssessment?.description,
    },
    {
      key: "recipient-configuration",
      label: t("report.general.configuration", "Configuration"),
      value: recipientConfiguration?.name || "—",
      isLink: Boolean(recipientConfiguration),
      linkTo: "/configurations",
      linkState: { configId: recipientConfiguration?.id },
    },
  ];
}

function InfoCard({ title, items }) {
  return (
    <RABox
      elevation={0}
      sx={{
        p: 3,
        height: "100%",
        border: ({ palette }) => `1px solid ${palette.light.main}`,
        borderRadius: 2,
        bgcolor: ({ palette }) =>
          palette.background.card || palette.background.default,
      }}
    >
      <RATypography variant="h5" fontWeight="bold" textAlign="center" mb={2}>
        {title}
      </RATypography>
      <RABox display="flex" flexDirection="column" gap={1.5}>
        {items.map((item) => (
          <RABox key={item.key}>
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
}

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.node,
      isLink: PropTypes.bool,
      linkTo: PropTypes.string,
      linkState: PropTypes.object,
    })
  ).isRequired,
};

export default function GeneralInfo({
  dsAssessment,
  rcAssessment,
  dsConfig,
  rcConfig,
  attributeScoringSystem,
}) {
  const { t } = useTranslation();
  const datasetInfoItems = useMemo(
    () =>
      buildDatasetInfoItems({
        datasetAssessment: dsAssessment,
        datasetConfiguration: dsConfig,
        attributeScoringSystem,
        t,
      }),
    [attributeScoringSystem, dsAssessment, dsConfig, t]
  );
  const recipientInfoItems = useMemo(
    () =>
      buildRecipientInfoItems({
        recipientAssessment: rcAssessment,
        recipientConfiguration: rcConfig,
        t,
      }),
    [rcAssessment, rcConfig, t]
  );

  return (
    <RABox>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <InfoCard
            title={t("report.general.datasetInfo", "Dataset Information")}
            items={datasetInfoItems}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoCard
            title={t("report.general.recipientInfo", "Recipient Information")}
            items={recipientInfoItems}
          />
        </Grid>
      </Grid>
    </RABox>
  );
}

GeneralInfo.propTypes = {
  dsAssessment: PropTypes.object,
  rcAssessment: PropTypes.object,
  dsConfig: PropTypes.object,
  rcConfig: PropTypes.object,
  attributeScoringSystem: PropTypes.object,
};

GeneralInfo.defaultProps = {
  dsAssessment: null,
  rcAssessment: null,
  dsConfig: null,
  rcConfig: null,
  attributeScoringSystem: null,
};
