import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import { useMaterialUIController } from "context";
import ReportDocument from "./components/ReportDocument";
import ReportExportActions from "./components/ReportExportActions";
import ReportErrorToast from "./components/shared/ReportErrorToast";
import {
  PDF_EXPORT_RENDER_DELAY_MS,
  buildReportPdfFilename,
  exportReportToExcel,
  exportReportToPdf,
  pdfStyles,
} from "./reportExportUtils";
import useDataSharingReport from "./useDataSharingReport";

export default function DataSharingReportPage() {
  const { t } = useTranslation();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const theme = useTheme();
  const reportContainerRef = useRef(null);
  const pdfExportTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [exportError, setExportError] = useState("");

  const report = useDataSharingReport();
  const {
    activityId,
    activity,
    attributeScoringSystem,
    effectiveTables,
    totalRiskResult,
    isComputing,
    errorMessage,
    identifiabilityThreshold,
    sensitivityThreshold,
    clearError,
  } = report;

  const reportError = errorMessage || exportError;
  const clearReportError = useCallback(() => {
    clearError();
    setExportError("");
  }, [clearError]);

  useEffect(
    () => () => {
      mountedRef.current = false;

      if (pdfExportTimerRef.current) {
        clearTimeout(pdfExportTimerRef.current);
      }
    },
    []
  );

  const handleDownloadPdf = useCallback(() => {
    clearReportError();
    setIsGeneratingPdf(true);

    if (pdfExportTimerRef.current) {
      clearTimeout(pdfExportTimerRef.current);
    }

    /**
     * html2canvas reads layout synchronously after html2pdf starts. The short
     * delay lets React commit the export-mode width before the DOM is captured.
     */
    pdfExportTimerRef.current = setTimeout(() => {
      pdfExportTimerRef.current = null;

      exportReportToPdf({
        element: reportContainerRef.current,
        filename: buildReportPdfFilename({ activity, activityId }),
      })
        .catch((error) => {
          if (!mountedRef.current) return;
          setExportError(
            error?.message || t("report.pdfError", "Failed to generate PDF")
          );
        })
        .finally(() => {
          if (mountedRef.current) {
            setIsGeneratingPdf(false);
          }
        });
    }, PDF_EXPORT_RENDER_DELAY_MS);
  }, [activity, activityId, clearReportError, t]);

  const handleDownloadExcel = useCallback(() => {
    clearReportError();

    try {
      exportReportToExcel({
        activity,
        activityId,
        attributeScoringSystem,
        effectiveTables,
        identifiabilityThreshold,
        sensitivityThreshold,
        totalRiskResult,
      });
    } catch (error) {
      setExportError(
        error?.message || t("report.excelError", "Failed to export to Excel")
      );
    }
  }, [
    activity,
    activityId,
    attributeScoringSystem,
    clearReportError,
    effectiveTables,
    identifiabilityThreshold,
    sensitivityThreshold,
    t,
    totalRiskResult,
  ]);
  const reportBackgroundColor = isGeneratingPdf
    ? "white"
    : darkMode
    ? theme.palette.background.default
    : theme.palette.white.main;

  return (
    <>
      <style>{pdfStyles}</style>

      <ReportDocument
        {...report}
        containerRef={reportContainerRef}
        isGeneratingPdf={isGeneratingPdf}
        backgroundColor={reportBackgroundColor}
      />

      <ReportExportActions
        isComputing={isComputing}
        isGeneratingPdf={isGeneratingPdf}
        onDownloadPdf={handleDownloadPdf}
        onDownloadExcel={handleDownloadExcel}
      />

      <ReportErrorToast message={reportError} onClose={clearReportError} />
    </>
  );
}
