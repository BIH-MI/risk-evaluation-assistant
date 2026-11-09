import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

import {
  buildAttributeAssessmentTables,
  formatScoringSystemLabel,
  isBlankValue,
  safeFileSegment,
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

const riskMeasureByReleaseModel = {
  NON_PUBLIC: "strict_average",
  SEMI_PUBLIC: "maximum",
  PUBLIC: "maximum",
};

function recommendedRiskMeasure(releaseModel) {
  return Object.prototype.hasOwnProperty.call(riskMeasureByReleaseModel, releaseModel)
    ? riskMeasureByReleaseModel[releaseModel]
    : unavailableText;
}

const riskMetrics = {
  "Re-identification Risk Threshold": (result) => result?.threshold,
  "Probability of Attack": (result) => result?.contextRisk?.numericValue,
  "Risk Threshold for Anonymization": (result) => result?.finalRisk?.numericValue,
};

function riskValueOrUnavailable(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && value.trim() === "")
  ) return unavailableText;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : unavailableText;
}

function valueOrUnavailable(value) {
  return isBlankValue(value) ? unavailableText : value;
}

function scoreOrUnavailable(value) {
  return isBlankValue(value) ? unavailableScoreText : value;
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
      Metric: "Release Model",
      Value: recommendedRiskMeasure(activity?.releaseModel) === unavailableText
        ? unavailableText : activity.releaseModel,
    },
    {
      Metric: "Risk Measure",
      Value: recommendedRiskMeasure(activity?.releaseModel),
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
    ...Object.entries(riskMetrics).map(([Metric, getValue]) => ({
      Metric,
      Value: riskValueOrUnavailable(getValue(totalRiskResult)),
    })),
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
      "Is Quasi-Identifier": attribute.quasiIdentifier ? "Yes" : "No",
      "Is Sensitive Attribute": attribute.sensitiveAttribute ? "Yes" : "No",
      "Is Excluded": attribute.isExcluded ? "Yes" : "No",
      Replicability: scoreOrUnavailable(attribute.replicability),
      Availability: scoreOrUnavailable(attribute.availability),
      Distinguishability: scoreOrUnavailable(attribute.distinguishability),
      Sensitivity: scoreOrUnavailable(attribute.sensitivity),
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
  const summaryRows = buildReportSummaryRows({
    activity,
    attributeScoringSystem,
    identifiabilityThreshold,
    sensitivityThreshold,
    totalRiskResult,
  });
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summaryRows.forEach(({ Metric, Value }, index) => {
    if (Object.prototype.hasOwnProperty.call(riskMetrics, Metric) && typeof Value === "number") {
      // Keep the response's fraction as a numeric cell; Excel handles percent display.
      summarySheet[XLSX.utils.encode_cell({ r: index + 1, c: 1 })].z = "0.00%";
    }
  });
  const attributeSheet = XLSX.utils.json_to_sheet(
    buildAttributeAssessmentExportRows({
      effectiveTables,
      identifiabilityThreshold,
      sensitivityThreshold,
      scoringSystem: attributeScoringSystem,
    })
  );

  summarySheet["!cols"] = [{ wch: 38 }, { wch: 65 }];
  attributeSheet["!cols"] = [28, 32, 20, 20, 22, 14, 16, 16, 20, 16]
    .map((wch) => ({ wch }));

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
