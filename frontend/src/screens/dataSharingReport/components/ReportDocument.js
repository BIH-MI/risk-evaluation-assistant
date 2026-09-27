import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import AttributeLevelAssessment from "./AttributeLevelAssessment";
import AttributeThresholdControls from "./AttributeThresholdControls";
import GeneralInfo from "./GeneralInfo";
import MitigationPlannerAction from "./MitigationPlannerAction";
import RiskAnalysisSummary from "./RiskAnalysisSummary";
import RiskFactors from "./RiskFactors";
import ReportResultSection from "./shared/ReportResultSection";
import ReportSectionLoading from "./shared/ReportSectionLoading";
import ReportSectionTitle from "./shared/ReportSectionTitle";

export default function ReportDocument({
  containerRef,
  isGeneratingPdf,
  backgroundColor,
  activity,
  datasetAssessment,
  recipientAssessment,
  datasetConfiguration,
  recipientConfiguration,
  attributeScoringSystem,
  effectiveTables,
  totalRiskResult,
  isComputing,
  isLoadingReportData,
  manualRiskThreshold,
  isThresholdOverwritten,
  identifiabilityThreshold,
  sensitivityThreshold,
  identifiabilityRange,
  sensitivityRange,
  setManualRiskThreshold,
  setThresholdOverwritten,
  updateIdentifiabilityThreshold,
  updateSensitivityThreshold,
}) {
  const { t } = useTranslation();
  const hasRiskBreakdown = Boolean(totalRiskResult?.categoryBreakdown);

  return (
    <div
      ref={containerRef}
      className={isGeneratingPdf ? "pdf-export-mode" : ""}
      style={{
        backgroundColor,
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <RABox
        p={4}
        sx={{
          maxWidth: 1000,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <RATypography variant="h4" fontWeight="bold" textAlign="center">
          {activity?.name || t("report.title")}
        </RATypography>

        {isLoadingReportData ? (
          <ReportSectionLoading
            label={t("report.loading", "Loading report...")}
          />
        ) : (
          <GeneralInfo
            dsAssessment={datasetAssessment}
            rcAssessment={recipientAssessment}
            dsConfig={datasetConfiguration}
            rcConfig={recipientConfiguration}
            attributeScoringSystem={attributeScoringSystem}
          />
        )}

        <div className="html2pdf__page-break" />

        <ReportResultSection
          title={t("report.riskFactorsBreakdown")}
          isComputing={isComputing}
          hasRiskBreakdown={hasRiskBreakdown}
        >
          <RiskFactors
            dsConfig={datasetConfiguration}
            rcConfig={recipientConfiguration}
            totalRiskResult={totalRiskResult}
          />
        </ReportResultSection>

        <div className="html2pdf__page-break" />

        <ReportResultSection
          title={t("report.riskAnalysisSummary")}
          isComputing={isComputing}
          hasRiskBreakdown={hasRiskBreakdown}
        >
          <RiskAnalysisSummary
            totalRiskResult={totalRiskResult}
            manualRiskThreshold={manualRiskThreshold}
            onManualThresholdChange={setManualRiskThreshold}
            isThresholdOverwritten={isThresholdOverwritten}
            onThresholdOverwriteChange={setThresholdOverwritten}
          />
        </ReportResultSection>

        {!isGeneratingPdf && (
          <MitigationPlannerAction
            activity={activity}
            isThresholdOverwritten={isThresholdOverwritten}
            manualRiskThreshold={manualRiskThreshold}
          />
        )}
      </RABox>

      <div className="html2pdf__page-break" />

      <RABox
        p={4}
        sx={{
          maxWidth: 1400,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <RABox mt={4} mb={4}>
          <ReportSectionTitle className="avoid-break">
            {t("report.attributeLevelAssessment")}
          </ReportSectionTitle>

          <AttributeThresholdControls
            identifiabilityThreshold={identifiabilityThreshold}
            sensitivityThreshold={sensitivityThreshold}
            identifiabilityRange={identifiabilityRange}
            sensitivityRange={sensitivityRange}
            onIdentifiabilityThresholdChange={updateIdentifiabilityThreshold}
            onSensitivityThresholdChange={updateSensitivityThreshold}
          />

          <AttributeLevelAssessment
            tableAssessments={effectiveTables}
            identifiabilityThreshold={identifiabilityThreshold}
            sensitivityThreshold={sensitivityThreshold}
            scoringSystem={attributeScoringSystem}
          />
        </RABox>
      </RABox>
    </div>
  );
}

const rangeType = PropTypes.shape({
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
});

ReportDocument.propTypes = {
  containerRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]).isRequired,
  isGeneratingPdf: PropTypes.bool.isRequired,
  backgroundColor: PropTypes.string.isRequired,
  activity: PropTypes.object,
  datasetAssessment: PropTypes.object,
  recipientAssessment: PropTypes.object,
  datasetConfiguration: PropTypes.object,
  recipientConfiguration: PropTypes.object,
  attributeScoringSystem: PropTypes.object,
  effectiveTables: PropTypes.arrayOf(PropTypes.object),
  totalRiskResult: PropTypes.object,
  isComputing: PropTypes.bool.isRequired,
  isLoadingReportData: PropTypes.bool.isRequired,
  manualRiskThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
  isThresholdOverwritten: PropTypes.bool.isRequired,
  identifiabilityThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  sensitivityThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  identifiabilityRange: rangeType.isRequired,
  sensitivityRange: rangeType.isRequired,
  setManualRiskThreshold: PropTypes.func.isRequired,
  setThresholdOverwritten: PropTypes.func.isRequired,
  updateIdentifiabilityThreshold: PropTypes.func.isRequired,
  updateSensitivityThreshold: PropTypes.func.isRequired,
};

ReportDocument.defaultProps = {
  activity: null,
  datasetAssessment: null,
  recipientAssessment: null,
  datasetConfiguration: null,
  recipientConfiguration: null,
  attributeScoringSystem: null,
  effectiveTables: [],
  totalRiskResult: null,
  manualRiskThreshold: "",
};
