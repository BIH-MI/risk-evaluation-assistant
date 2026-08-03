import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "../../components/layout/RABox";
import RATypography from "../../components/display/RATypography";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

import RAButton from "../../components/input/RAButton";
import RAAlert from "../../components/feedback/RAAlert";
import AttributeLevelAssessment from "./AttributeLevelAssessment";
import RiskFactors from "./RiskFactors";
import RiskAnalysisSummary from "./RiskAnalysisSummary";
import DownloadIcon from "@mui/icons-material/Download";
import TableViewIcon from "@mui/icons-material/TableView";
import RAInput from "../../components/input/RAInput";
import GeneralInfo from "./GeneralInfo";

import { calculateTotalRiskApi } from "../../api/risk";
import { fetchConfiguration } from "store/configurations/configurationThunks";
import {
  ATTRIBUTE_SCALE_DEFAULTS,
  ATTRIBUTE_SCALE_MAX,
  ATTRIBUTE_SCALE_MIN,
  ATTRIBUTE_SCALE_RANGE_LABEL,
  normalizeAttributeScaleValue,
} from "utils/AttributeScale";

const pdfStyles = `
  .pdf-export-mode {
    width: 1600px !important;
    max-width: 1600px !important;
    margin: 0 auto;
  }
  .pdf-export-mode .MuiTableContainer-root {
    overflow: visible !important;
    box-shadow: none !important;
  }
  .pdf-export-mode table {
    width: 100% !important;
  }
  .pdf-export-mode thead {
    display: table-header-group;
  }
`;

const normalizeReportAttributeScores = (attr) => {
  const isDirectIdentifier = Boolean(attr.isDirectIdentifier);
  const isExcluded = Boolean(attr.isExcluded);

  return {
    ...attr,
    sensitivity:
      isDirectIdentifier || isExcluded
        ? null
        : normalizeAttributeScaleValue(attr.sensitivity, "sensitivity", {
            allowNull: false,
          }),
    replicability:
      isDirectIdentifier || isExcluded
        ? null
        : normalizeAttributeScaleValue(attr.replicability, "replicability", {
            allowNull: false,
          }),
    availability:
      isDirectIdentifier || isExcluded
        ? null
        : normalizeAttributeScaleValue(attr.availability, "availability", {
            allowNull: false,
          }),
    distinguishability:
      isDirectIdentifier || isExcluded
        ? null
        : normalizeAttributeScaleValue(
            attr.distinguishability,
            "distinguishability",
            { allowNull: false }
          ),
  };
};

const safeFileSegment = (value, fallback) => {
  const segment = String(value || fallback || "report")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();

  return segment || fallback || "report";
};

export default function DataSharingReportPage() {
  const { id: rawId } = useParams();
  const activityId = Number(rawId);
  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const reportContainerRef = useRef(null);

  const { items: activities } = useSelector((s) => s.dataSharingActivities);
  const { items: datasetAssessments } = useSelector(
    (s) => s.datasetAssessments
  );
  const { items: recipientAssessments } = useSelector(
    (s) => s.recipientAssessments
  );

  const { items: configItems } = useSelector((s) => s.configurations);

  const activity = useMemo(
    () => activities.find((a) => a.id === activityId),
    [activities, activityId]
  );
  const dsAssessment = useMemo(
    () =>
      activity
        ? datasetAssessments.find(
            (da) => da.id === activity.datasetAssessmentId
          )
        : null,
    [datasetAssessments, activity]
  );
  const rcAssessment = useMemo(
    () =>
      activity
        ? recipientAssessments.find(
            (ra) => ra.id === activity.recipientAssessmentId
          )
        : null,
    [recipientAssessments, activity]
  );

  const dsConfig = useMemo(
    () =>
      dsAssessment?.configurationId
        ? configItems.find((c) => c.id === dsAssessment.configurationId)
        : null,
    [configItems, dsAssessment]
  );

  const rcConfig = useMemo(
    () =>
      rcAssessment?.configurationId
        ? configItems.find((c) => c.id === rcAssessment.configurationId)
        : null,
    [configItems, rcAssessment]
  );

  // Fetch configs if they aren't loaded in the store
  useEffect(() => {
    if (token) {
      if (dsAssessment?.configurationId) {
        dispatch(
          fetchConfiguration({ id: dsAssessment.configurationId, token })
        );
      }
      if (
        rcAssessment?.configurationId &&
        rcAssessment.configurationId !== dsAssessment?.configurationId
      ) {
        dispatch(
          fetchConfiguration({ id: rcAssessment.configurationId, token })
        );
      }
    }
  }, [dsAssessment, rcAssessment, token, dispatch]);

  const effectiveTables = useMemo(() => {
    if (activity?.tableAssessments && activity.tableAssessments.length > 0) {
      return activity.tableAssessments.map((ta) => ({
        ...ta,
        attributes: (ta.attributes || []).map(normalizeReportAttributeScores),
      }));
    }
    if (!dsAssessment?.tableAssessments) return [];
    return dsAssessment.tableAssessments.map((ta) => ({
      id: ta.tableId,
      tableId: ta.tableId,
      tableName: ta.tableName,
      attributes: (ta.attributes || []).map((attr) =>
        normalizeReportAttributeScores({
          id: attr.id ?? attr.attributeId,
          attributeId: attr.attributeId ?? attr.id,
          name: attr.name,
          sensitivity: attr.sensitivity,
          replicability: attr.replicability,
          availability: attr.availability,
          distinguishability: attr.distinguishability,
          isDirectIdentifier: Boolean(attr.isDirectIdentifier),
          isExcluded: Boolean(attr.isExcluded),
        })
      ),
    }));
  }, [activity?.tableAssessments, dsAssessment?.tableAssessments]);

  const [isThresholdOverwritten, setIsThresholdOverwritten] = useState(false);
  const [manualRiskThreshold, setManualRiskThreshold] = useState("");

  const [identifiabilityThreshold, setIdentifiabilityThreshold] = useState("5");
  const [sensitivityThreshold, setSensitivityThreshold] = useState(
    String(ATTRIBUTE_SCALE_DEFAULTS.sensitivity)
  );

  const [totalRiskResult, setTotalRiskResult] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [computeError, setComputeError] = useState("");

  const handleCalculate = useCallback(async () => {
    if (!activityId || !token) return;
    setIsComputing(true);
    setComputeError("");

    const payload = {
      activityId,
      manualRiskThreshold:
        isThresholdOverwritten && manualRiskThreshold
          ? Number(manualRiskThreshold)
          : null,
    };

    try {
      const result = await calculateTotalRiskApi(payload, token);
      setTotalRiskResult(result);
    } catch (err) {
      setComputeError(
        err?.message || t("report.calculateError", "Failed to calculate risk")
      );
    } finally {
      setIsComputing(false);
    }
  }, [activityId, isThresholdOverwritten, manualRiskThreshold, token, t]);

  useEffect(() => {
    handleCalculate();
  }, [handleCalculate]);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);

    setTimeout(() => {
      const element = reportContainerRef.current;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Risk-Assessment-Report-${safeFileSegment(
          activity?.name,
          activityId
        )}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 1650,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: ["tr", "h5", "h6", ".avoid-break"],
        },
        jsPDF: { unit: "mm", format: "a3", orientation: "landscape" },
      };

      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .catch((err) => {
          setComputeError(
            err?.message || t("report.pdfError", "Failed to generate PDF")
          );
        })
        .finally(() => {
          setIsGeneratingPdf(false);
        });
    }, 300);
  };

  // --- EXCEL EXPORT LOGIC ---
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet (Stripped of numerical metrics)
    const summaryData = [
      { Metric: "Activity Title", Value: activity?.name || "N/A" },
      {
        Metric: "Final Risk Classification",
        Value: totalRiskResult?.finalRisk?.categoricalValue ?? "N/A",
      },
    ];

    if (totalRiskResult?.categoryBreakdown) {
      summaryData.push({ Metric: "", Value: "" }); // Blank row
      summaryData.push({ Metric: "--- CATEGORY BREAKDOWN ---", Value: "" });
      Object.entries(totalRiskResult.categoryBreakdown).forEach(
        ([code, cat]) => {
          summaryData.push({
            Metric: `${code} Band`,
            Value: cat.categoricalValue,
          });
        }
      );
    }

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // 2. Attribute Assessment Sheet
    let attrData = [];
    effectiveTables.forEach((table) => {
      table.attributes?.forEach((attr) => {
        attrData.push({
          "Table Name": table.tableName,
          "Attribute Name": attr.name,
          "Is Direct Identifier": attr.isDirectIdentifier ? "Yes" : "No",
          Replicability: attr.replicability || 0,
          Availability: attr.availability || 0,
          Distinguishability: attr.distinguishability || 0,
          Sensitivity: attr.sensitivity || 0,
          "Total QI Score":
            (attr.replicability || 0) +
            (attr.availability || 0) +
            (attr.distinguishability || 0),
        });
      });
    });

    const attrSheet = XLSX.utils.json_to_sheet(
      attrData.length ? attrData : [{ Note: "No Attributes Assessed" }]
    );
    XLSX.utils.book_append_sheet(wb, attrSheet, "Attributes");

    // Trigger download
    XLSX.writeFile(
      wb,
      `Risk_Report_${safeFileSegment(activity?.name, activityId)}.xlsx`
    );
  };

  return (
    <>
      <style>{pdfStyles}</style>

      <div
        ref={reportContainerRef}
        className={isGeneratingPdf ? "pdf-export-mode" : ""}
        style={{ backgroundColor: "white", padding: "20px" }}
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
          {/* ======================= PAGE 1: GENERAL INFO ======================= */}
          <RATypography variant="h4" fontWeight="bold" textAlign="center">
            {activity?.name || t("report.title")}
          </RATypography>

          <GeneralInfo
            dsAssessment={dsAssessment}
            rcAssessment={rcAssessment}
            dsConfig={dsConfig}
            rcConfig={rcConfig}
          />

          {/* ======================= PAGE 2: RISK FACTORS ======================= */}
          <div className="html2pdf__page-break"></div>

          <RATypography variant="h5" textAlign="center">
            <strong>{t("report.riskFactorsBreakdown")}</strong>{" "}
          </RATypography>

          <RABox>
            {isComputing ? (
              <RABox display="flex" justifyContent="center">
                <CircularProgress />
              </RABox>
            ) : totalRiskResult && totalRiskResult.categoryBreakdown ? (
              <RiskFactors
                dsConfig={dsConfig}
                rcConfig={rcConfig}
                totalRiskResult={totalRiskResult}
              />
            ) : null}
          </RABox>

          {/* ======================= PAGE 3: RISK SUMMARY ======================= */}
          <div className="html2pdf__page-break"></div>

          <RATypography variant="h5" textAlign="center">
            <strong>{t("report.riskAnalysisSummary")}</strong>{" "}
          </RATypography>

          <RABox>
            {isComputing ? (
              <RABox display="flex" justifyContent="center">
                <CircularProgress />
              </RABox>
            ) : totalRiskResult && totalRiskResult.categoryBreakdown ? (
              <RiskAnalysisSummary
                totalRiskResult={totalRiskResult}
                riskFormula={
                  dsConfig?.riskFormula || "Standard mathematical evaluation"
                }
                manualRiskThreshold={manualRiskThreshold}
                onManualThresholdChange={setManualRiskThreshold}
                isThresholdOverwritten={isThresholdOverwritten}
                onThresholdOverwriteChange={setIsThresholdOverwritten}
              />
            ) : null}
          </RABox>
        </RABox>

        {/* ======================= PAGE 4: ATTRIBUTE TABLES ======================= */}
        <div className="html2pdf__page-break"></div>

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
            <RATypography
              variant="h5"
              mb={1}
              textAlign="center"
              className="avoid-break"
            >
              <strong>{t("report.attributeLevelAssessment")}</strong>{" "}
            </RATypography>

            <RABox
              display="flex"
              gap={2}
              justifyContent="center"
              my={3}
              mb={5}
              flexWrap="wrap"
              data-html2canvas-ignore="true"
            >
              <RAInput
                label={t("report.identifiabilityThreshold")}
                type="number"
                inputProps={{ min: 1, max: 9, step: 1 }}
                value={identifiabilityThreshold}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return setIdentifiabilityThreshold("");
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
                label={t("report.sensitivityThreshold", {
                  scaleRange: ATTRIBUTE_SCALE_RANGE_LABEL,
                })}
                type="number"
                inputProps={{
                  min: ATTRIBUTE_SCALE_MIN,
                  max: ATTRIBUTE_SCALE_MAX,
                  step: 1,
                }}
                value={sensitivityThreshold}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return setSensitivityThreshold("");
                  const num = parseInt(v, 10);
                  if (!isNaN(num))
                    setSensitivityThreshold(
                      String(
                        Math.max(
                          ATTRIBUTE_SCALE_MIN,
                          Math.min(ATTRIBUTE_SCALE_MAX, num)
                        )
                      )
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

      <RABox display="flex" gap={3} justifyContent="center" my={4}>
        <RAButton
          variant="outlined"
          startIcon={
            isGeneratingPdf ? <CircularProgress size={20} /> : <DownloadIcon />
          }
          disabled={isComputing || isGeneratingPdf}
          onClick={handleDownloadPdf}
          aria-label={t("report.downloadPdf")}
        >
          {isGeneratingPdf
            ? t("report.generatingPdf")
            : t("report.downloadPdf")}{" "}
        </RAButton>

        <RAButton
          variant="contained"
          color="success"
          startIcon={<TableViewIcon />}
          disabled={isComputing || isGeneratingPdf}
          onClick={handleDownloadExcel}
          aria-label="Export to Excel"
          sx={{ color: "white" }}
        >
          Export to Excel
        </RAButton>
      </RABox>

      {computeError && (
        <RABox
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            width: 360,
            zIndex: 2000,
          }}
        >
          <RAAlert color="error" dismissible onClose={() => setComputeError("")}>
            <RATypography variant="body2" color="white">
              {computeError}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </>
  );
}
