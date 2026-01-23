import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useSelector } from "react-redux";
import { useTheme, Grid, CircularProgress} from "@mui/material";
import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import { useReactToPrint } from "react-to-print";
import { calculateExposureRiskApi } from "../../../api/report";

import RAButton from "../../../components/input/RAButton";
import RAAlert from "../../../components/feedback/RAAlert";
import AttributeLevelAssessment from "./AttributeLevelAssessment";
import RiskFactors from "./RiskFactors";
import RiskAnalysisSummary from "./RiskAnalysisSummary";
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import RAInput from "../../../components/input/RAInput";
import GeneralInfo from "./GeneralInfo";

const printStyles = `
  @media print {
    @page {
      size: landscape;
      margin: 10mm; /* Reduced margin to maximize space */
    }
    
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      background-color: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Force page breaks where needed */
    .page-break {
      page-break-before: always;
      break-before: always;
      display: block;
      height: 0;
    }

    /* Prevent breaking inside charts and summary blocks */
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
      display: block; /* Ensures break properties work */
    }

    /* Fix font scaling and clarity */
    .MuiTypography-root {
      color: #000 !important; /* Ensure text is black */
    }

    /* OPTIONAL: Compact spacing for print to fit charts better */
    .compact-print-gap {
      gap: 16px !important;
    }
  }
`;

export default function DataSharingReportPage() {
  const { id: rawId } = useParams();
  const activityId = Number(rawId);
  const { user } = useAuth();
  const token = user?.access_token;
  const theme = useTheme();
  const reportContainerRef = useRef(null);

  // Redux Selectors
  const { items: activities } = useSelector((s) => s.dataSharingActivities);
  const { items: reports } = useSelector((s) => s.reports);
  const { items: allQuestions } = useSelector((s) => s.questions);
  const { items: datasetAssessments } = useSelector((s) => s.datasetAssessments);
  const { items: recipientAssessments } = useSelector((s) => s.recipientAssessments);
  const { items: riskBands } = useSelector((s) => s.riskBands);

  // Resolve Metadata
  const activity = useMemo(() => activities.find((a) => a.id === activityId), [activities, activityId]);
  const report = useMemo(() => activity?.reportId ? reports.find((r) => r.id === activity.reportId) : null, [reports, activity]);
  const dsAssessment = useMemo(() => activity ? datasetAssessments.find((da) => da.id === activity.datasetAssessmentId) : null, [datasetAssessments, activity]);
  const rcAssessment = useMemo(() => activity ? recipientAssessments.find((ra) => ra.id === activity.recipientAssessmentId) : null, [recipientAssessments, activity]);

  const effectiveTables = useMemo(() => {
    if (activity?.tableAssessments && activity.tableAssessments.length > 0) {
      return activity.tableAssessments;
    }
    if (!dsAssessment?.tableAssessments) return [];
    return dsAssessment.tableAssessments.map((ta) => ({
      id: ta.tableId,
      tableId: ta.tableId,
      tableName: ta.tableName,
      attributes: (ta.attributes || []).map((attr) => ({
        id: attr.id ?? attr.attributeId,
        attributeId: attr.attributeId ?? attr.id,
        name: attr.name,
        sensitivity: attr.sensitivity ?? 1,
        replicability: attr.replicability ?? 1,
        availability: attr.availability ?? 1,
        distinguishability: attr.distinguishability ?? 1,
        isDirectIdentifier: Boolean(attr.isDirectIdentifier),
        isExcluded: Boolean(attr.isExcluded),
      })),
    }));
  }, [activity?.tableAssessments, dsAssessment?.tableAssessments]);

  // Threshold Control
  const [isThresholdOverwritten, setIsThresholdOverwritten] = useState(false);
  const [manualRiskThreshold, setManualRiskThreshold] = useState(""); // User input

  // Attribute Assessment Config
  const [identifiabilityThreshold, setIdentifiabilityThreshold] = useState("5");
  const [sensitivityThreshold, setSensitivityThreshold] = useState("2");

  // Results from API
  const [totalRiskResult, setTotalRiskResult] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [apiError, setApiError] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);

  // Load Initial State from Saved Report
  useEffect(() => {
    if (report) {
      if (report.userRiskThreshold) {
        setManualRiskThreshold(report.userRiskThreshold);
        setIsThresholdOverwritten(true);
      }
    }
    // Initial Calc
    handleCalculate(false);
  }, [report]);

  // Unified risk calculation
  const handleCalculate = async (save = false) => {
    if (!activityId) return;
    setIsComputing(true);
    setApiError("");

    // Prepare payload - Overrides always null
    const payload = {
      activityId,
      reportId: report?.id,
      manualRiskThreshold: isThresholdOverwritten && manualRiskThreshold ? Number(manualRiskThreshold) : null
    };

    try {
      const result = await calculateExposureRiskApi(payload, save, token);
      setTotalRiskResult(result);
      if (save) setSaveStatus("success");
    } catch (err) {
      console.error(err);
      setApiError("Calculation failed.");
      if (save) setSaveStatus("error");
    } finally {
      setIsComputing(false);
    }
  };

  // Trigger Calc on Change
  useEffect(() => {
    handleCalculate(false);
  }, [isThresholdOverwritten, manualRiskThreshold]);

  // PDF download handler
  const handlePrint = useReactToPrint({
    contentRef: reportContainerRef,
    documentTitle: `activity-${activityId}`,
    onAfterPrint: () => console.log("Print finished"),
    suppressErrors: true,
  });

  console.log("total risk result", totalRiskResult);
  console.log("riskBands", riskBands);


  return (
    <>
      {/* Inject print styles */}
      <style>{printStyles}</style>
      <div ref={reportContainerRef}>
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
          {/* HEADER */}
          <RATypography variant="h4" fontWeight="bold" textAlign="center">
            {activity?.name || "Data Sharing Report"}
          </RATypography>

          {/* GENERAL INFO */}
          <GeneralInfo
            dsAssessment={dsAssessment}
            rcAssessment={rcAssessment} />

          {/* 2. RISK ANALYSIS SECTION */}

          <RATypography variant="h5" textAlign="center" mt={4}>
            <strong>Risk Analysis Results</strong>
          </RATypography>

          {/* Risk Factors */}
          <RABox>
            {isComputing ? (
              <RABox display="flex" justifyContent="center">
                <CircularProgress />
              </RABox>
            ) : totalRiskResult ? (
              <RiskFactors
                allQuestions={allQuestions}
                dsAssessment={dsAssessment}
                rcAssessment={rcAssessment}
                riskBands={riskBands}
                contextRiskResult={{
                  ipClassification: totalRiskResult.invasionPrivacyClassification,
                  mitcClassification: totalRiskResult.mitigatingControlsClassification,
                  motcClassification: totalRiskResult.motivesCapacityClassification
                }}
              />
            ) : null}
          </RABox>

          {/* Risk Analysis Summary */}
          <RABox>
            {isComputing ? (
              <RABox display="flex" justifyContent="center">
                <CircularProgress />
              </RABox>
            ) : totalRiskResult ? (
              <RiskAnalysisSummary
                totalRiskResult={totalRiskResult}
                manualRiskThreshold={manualRiskThreshold}
                onManualThresholdChange={setManualRiskThreshold}
                isThresholdOverwritten={isThresholdOverwritten}
                onThresholdOverwriteChange={setIsThresholdOverwritten}
              />
            ) : null}
          </RABox>

        </RABox>
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
          {/* ATTRIBUTE ASSESSMENT */}
          <RABox mt={4} mb={4}>
            <RATypography variant="h5" mb={1} textAlign="center">
              <strong>Attribute Risk Assessment Results</strong>
            </RATypography>

            <RATypography variant="body2" paragraph mb={2} mt={3}>
              Adjust the thresholds below to control the attribute-level
              assessment:
            </RATypography>

            <RABox
              display="flex"
              gap={2}
              justifyContent="center"
              my={3}
              mb={5}
              flexWrap="wrap"
            >
              <RAInput
                label="Identifiability Threshold (1-9)"
                type="number"
                inputProps={{ min: 1, max: 9, step: 1 }}
                value={identifiabilityThreshold}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setIdentifiabilityThreshold("");
                    return;
                  }
                  const num = parseInt(v, 10);
                  if (!isNaN(num))
                    setIdentifiabilityThreshold(
                      String(Math.max(1, Math.min(9, num)))
                    );
                }}
                fullWidth
                sx={{ maxWidth: 250 }}
              />

              <RAInput
                label="Sensitivity Threshold (1-3)"
                type="number"
                inputProps={{ min: 1, max: 3, step: 1 }}
                value={sensitivityThreshold}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setSensitivityThreshold("");
                    return;
                  }
                  const num = parseInt(v, 10);
                  if (!isNaN(num))
                    setSensitivityThreshold(
                      String(Math.max(1, Math.min(3, num)))
                    );
                }}
                fullWidth
                sx={{ maxWidth: 250 }}
              />
            </RABox>

            <AttributeLevelAssessment
              tableAssessments={effectiveTables}
              identifiabilityThreshold={Number(identifiabilityThreshold) || 0}
              sensitivityThreshold={Number(sensitivityThreshold) || 0}
            />
          </RABox>
        </RABox>
      </div>

      <div className="page-break" />

      {/* Buttons */}
      <RABox display="flex" justifyContent="center" my={10}>
        <RAButton
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={isComputing}
          onClick={() => {
            setSaveStatus(null);
            handleCalculate(true);
          }}
          aria-label="Save Total Risk"
        >
          Save
        </RAButton>
        <RAButton
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={isComputing}
          onClick={handlePrint}
          sx={{ ml: 2 }}
          aria-label="Download PDF Report"
        >
          PDF
        </RAButton>
      </RABox>

      {/* Toast */}
      {saveStatus && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            zIndex: theme.zIndex.snackbar,
            width: 300,
            mb: 3,
          }}
        >
          <RABox position="fixed" bottom={24} right={24} zIndex={9999}>
            <RAAlert
              color={saveStatus === "success" ? "success" : "error"}
              onClose={() => setSaveStatus(null)}
            >
              {saveStatus === "success"
                ? "Report Saved Successfully"
                : apiError || "Error saving report"}
            </RAAlert>
          </RABox>
        </RABox>
      )}
    </>
  );
}