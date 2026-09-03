import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import ReportSectionLoading from "./ReportSectionLoading";
import ReportSectionTitle from "./ReportSectionTitle";

export default function ReportResultSection({
  title,
  isComputing,
  hasRiskBreakdown,
  children,
}) {
  const { t } = useTranslation();

  return (
    <>
      <ReportSectionTitle>{title}</ReportSectionTitle>
      <RABox>
        {isComputing ? (
          <ReportSectionLoading
            label={t("report.calculating", "Calculating risk...")}
          />
        ) : (
          hasRiskBreakdown && children
        )}
      </RABox>
    </>
  );
}

ReportResultSection.propTypes = {
  title: PropTypes.node.isRequired,
  isComputing: PropTypes.bool.isRequired,
  hasRiskBreakdown: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};
