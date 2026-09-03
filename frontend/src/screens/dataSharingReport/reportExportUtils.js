import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

import {
  buildAttributeAssessmentTables,
  formatScoringSystemLabel,
  isBlankValue,
  safeFileSegment,
  thresholdInputToNumber,
} from "./reportDataUtils";

export const PDF_EXPORT_RENDER_DELAY_MS = 300;

export const pdfStyles = `
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

const unavailableText = "N/A";
const unavailableScoreText = "-";

function valueOrUnavailable(value) {
  return isBlankValue(value) ? unavailableText : value;
}

function scoreOrUnavailable(value) {
  return isBlankValue(value) ? unavailableScoreText : value;
}

function formatThresholdForExport(value) {
  return isBlankValue(value) ? unavailableText : thresholdInputToNumber(value);
}

export function buildReportPdfFilename({ activity, activityId }) {
  return `Risk-Assessment-Report-${safeFileSegment(
    activity?.name,
    activityId
  )}.pdf`;
}

export function buildReportExcelFilename({ activity, activityId }) {
  return `Risk_Report_${safeFileSegment(activity?.name, activityId)}.xlsx`;
}

export function buildPdfExportOptions({ filename }) {
  return {
    margin: [10, 10, 10, 10],
    filename,
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
}

export function exportReportToPdf({ element, filename }) {
  if (!element) {
    return Promise.reject(new Error("Report content is unavailable"));
  }

  return html2pdf()
    .set(buildPdfExportOptions({ filename }))
    .from(element)
    .save();
}

export function buildReportSummaryRows({
  activity,
  attributeScoringSystem,
  identifiabilityThreshold,
  sensitivityThreshold,
  totalRiskResult,
}) {
  const summaryRows = [
    {
      Metric: "Activity Title",
      Value: valueOrUnavailable(activity?.name),
    },
    {
      Metric: "Scoring System",
      Value: formatScoringSystemLabel(attributeScoringSystem),
    },
    {
      Metric: "Identifiability Threshold",
      Value: valueOrUnavailable(identifiabilityThreshold),
    },
    {
      Metric: "Sensitivity Threshold",
      Value: valueOrUnavailable(sensitivityThreshold),
    },
    {
      Metric: "Final Risk Classification",
      Value: totalRiskResult?.finalRisk?.categoricalValue ?? unavailableText,
    },
  ];

  if (totalRiskResult?.categoryBreakdown) {
    summaryRows.push({ Metric: "", Value: "" });
    summaryRows.push({ Metric: "--- CATEGORY BREAKDOWN ---", Value: "" });

    Object.entries(totalRiskResult.categoryBreakdown).forEach(
      ([code, category]) => {
        summaryRows.push({
          Metric: `${code} Band`,
          Value: category.categoricalValue,
        });
      }
    );
  }

  return summaryRows;
}

export function buildAttributeAssessmentExportRows({
  effectiveTables,
  identifiabilityThreshold,
  sensitivityThreshold,
  scoringSystem,
}) {
  const tableSections = buildAttributeAssessmentTables({
    tableAssessments: effectiveTables,
    identifiabilityThreshold,
    sensitivityThreshold,
    scoringSystem,
  });

  const attributeRows = tableSections.flatMap((tableSection) =>
    tableSection.rows.map((attribute) => ({
      "Table Name": tableSection.tableName,
      "Attribute Name": attribute.name,
      "Is Direct Identifier": attribute.directIdentifier ? "Yes" : "No",
      Replicability: scoreOrUnavailable(attribute.replicability),
      Availability: scoreOrUnavailable(attribute.availability),
      Distinguishability: scoreOrUnavailable(attribute.distinguishability),
      Sensitivity: scoreOrUnavailable(attribute.sensitivity),
      "Identifiability Threshold": formatThresholdForExport(
        identifiabilityThreshold
      ),
      "Sensitivity Threshold": formatThresholdForExport(sensitivityThreshold),
      "Total QI Score": scoreOrUnavailable(attribute.totalQiScore),
    }))
  );

  return attributeRows.length
    ? attributeRows
    : [{ Note: "No Attributes Assessed" }];
}

export function buildRiskReportWorkbook({
  activity,
  attributeScoringSystem,
  effectiveTables,
  identifiabilityThreshold,
  sensitivityThreshold,
  totalRiskResult,
}) {
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(
    buildReportSummaryRows({
      activity,
      attributeScoringSystem,
      identifiabilityThreshold,
      sensitivityThreshold,
      totalRiskResult,
    })
  );
  const attributeSheet = XLSX.utils.json_to_sheet(
    buildAttributeAssessmentExportRows({
      effectiveTables,
      identifiabilityThreshold,
      sensitivityThreshold,
      scoringSystem: attributeScoringSystem,
    })
  );

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, attributeSheet, "Attributes");

  return workbook;
}

export function exportReportToExcel({
  activity,
  activityId,
  attributeScoringSystem,
  effectiveTables,
  identifiabilityThreshold,
  sensitivityThreshold,
  totalRiskResult,
}) {
  const workbook = buildRiskReportWorkbook({
    activity,
    attributeScoringSystem,
    effectiveTables,
    identifiabilityThreshold,
    sensitivityThreshold,
    totalRiskResult,
  });

  XLSX.writeFile(workbook, buildReportExcelFilename({ activity, activityId }));
}
