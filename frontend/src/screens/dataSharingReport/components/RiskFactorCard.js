import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABarChart from "components/display/RABarChart";
import NestedRiskPieChart from "components/display/NestedRiskPieChart";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  getCategoryDisplayName,
  hasCategoryData,
  isProtectiveRiskCategory,
} from "../reportDataUtils";

export default function RiskFactorCard({
  code,
  data,
  configuration,
  unknownText,
}) {
  const { t } = useTranslation();
  const resultClass = data?.categoricalValue || unknownText;
  const categoryBands = configuration?.riskBands || [];
  const categoryName = getCategoryDisplayName(code, configuration);
  const isHighRiskTriggered = Boolean(data?.isHighRiskTriggered);
  const showChart = hasCategoryData(data) || isHighRiskTriggered;

  return (
    <Grid item xs={12} md={4}>
      <RABox
        p={3}
        height="100%"
        display="flex"
        flexDirection="column"
        gap={1}
        sx={({ palette, boxShadows }) => ({
          border: `1px solid ${palette.light.main}`,
          borderRadius: "8px",
          bgcolor: palette.background.card || palette.background.default,
          boxShadow: boxShadows.sm,
        })}
      >
        <RABox display="flex" justifyContent="center" alignItems="center">
          <RATypography variant="h6" fontWeight="bold">
            {categoryName}
          </RATypography>
        </RABox>

        <RABox px={1}>
          {categoryBands.length > 0 ? (
            <RABarChart
              value={resultClass}
              riskBands={categoryBands}
              invert={isProtectiveRiskCategory(code, configuration)}
              category={code}
              highRiskTriggered={isHighRiskTriggered}
            />
          ) : (
            <RATypography
              variant="caption"
              display="block"
              mt={1}
              color="error"
            >
              {t(
                "report.factors.noBands",
                "No risk bands defined for this category."
              )}
            </RATypography>
          )}
        </RABox>

        <RABox flexGrow={1} minHeight={195} position="relative">
          {showChart ? (
            <NestedRiskPieChart categoryData={data} />
          ) : (
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
          )}
        </RABox>
      </RABox>
    </Grid>
  );
}

RiskFactorCard.propTypes = {
  code: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  configuration: PropTypes.object,
  unknownText: PropTypes.string.isRequired,
};

RiskFactorCard.defaultProps = {
  configuration: null,
};
