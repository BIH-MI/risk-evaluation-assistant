import React from "react";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  EvidenceMetricRow,
  EvidenceSection,
} from "./EvidencePrimitives";
import {
  buildEquivalenceClassSizeEvidenceRows,
  formatMethod,
  formatMetricNumber,
  formatUnavailableReason,
  hasEmpiricalEvidenceDetails,
  hasEvidenceValue,
  hasQuantitativeEvidenceDetails,
  titleCaseToken,
} from "./evidenceUtils";

function StatisticalEvidence({ evidence, field, t }) {
  const metricRows = [];
  let equivalenceClassRows = [];
  const empirical = field === "replicability" ? evidence.empirical : null;
  const quantitative =
    field === "distinguishability" ? evidence.quantitative : null;

  if (hasEmpiricalEvidenceDetails(empirical)) {
    if (empirical.available === false) {
      metricRows.push({
        label: t("datasetAssessments.evidence.unavailable", "Unavailable"),
        value: formatUnavailableReason(empirical.reason),
      });
    } else {
      [
        [
          t("datasetAssessments.evidence.score", "Score"),
          empirical.score,
          formatMetricNumber,
        ],
        [
          t("datasetAssessments.evidence.method", "Method"),
          empirical.method,
          formatMethod,
        ],
        [
          t(
            "datasetAssessments.evidence.validComparisons",
            "Valid comparisons"
          ),
          empirical.comparisonCount,
          formatMetricNumber,
        ],
        [
          t(
            "datasetAssessments.evidence.repeatedSubjects",
            "Repeated subjects"
          ),
          empirical.repeatedSubjectCount,
          formatMetricNumber,
        ],
        [
          t(
            "datasetAssessments.evidence.repeatedSubjectFraction",
            "Repeated subject fraction"
          ),
          empirical.repeatedSubjectFraction,
          formatMetricNumber,
        ],
        [
          t("datasetAssessments.evidence.analysisUnit", "Analysis unit"),
          empirical.analysisUnit,
          titleCaseToken,
        ],
      ].forEach(([label, value, formatter]) => {
        if (hasEvidenceValue(value)) {
          metricRows.push({ label, value: formatter(value) });
        }
      });
    }
  }

  if (hasQuantitativeEvidenceDetails(quantitative)) {
    [
      [
        t("datasetAssessments.evidence.distinction", "Distinction"),
        quantitative.distinction,
      ],
      [
        t("datasetAssessments.evidence.separation", "Separation"),
        quantitative.separation,
      ],
      [
        t(
          "datasetAssessments.evidence.singletonFraction",
          "Singleton fraction"
        ),
        quantitative.singletonFraction,
      ],
    ].forEach(([label, value]) => {
      if (hasEvidenceValue(value)) {
        metricRows.push({ label, value: formatMetricNumber(value) });
      }
    });

    equivalenceClassRows = buildEquivalenceClassSizeEvidenceRows(
      quantitative,
      t
    );
  }

  if (!metricRows.length && !equivalenceClassRows.length) return null;

  const sectionTitle =
    field === "replicability"
      ? t(
          "datasetAssessments.evidence.empiricalReplicability",
          "Empirical Replicability"
        )
      : t(
          "datasetAssessments.evidence.statisticalEvidence",
          "Statistical Evidence"
        );

  return (
    <EvidenceSection title={sectionTitle}>
      {metricRows.map(({ label, value }) => (
        <EvidenceMetricRow
          key={`${label}:${value}`}
          label={label}
          value={value}
        />
      ))}
      {equivalenceClassRows.length > 0 && (
        <RABox
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            mt: 0.5,
            minWidth: 0,
          }}
        >
          <RATypography
            variant="caption"
            color="white"
            fontWeight="bold"
            display="block"
            sx={{
              fontSize: "0.72rem",
              lineHeight: 1.3,
              opacity: 0.9,
              overflowWrap: "anywhere",
            }}
          >
            {t(
              "datasetAssessments.evidence.equivalenceClasses",
              "Equivalence classes"
            )}
          </RATypography>
          {equivalenceClassRows.map(({ label, value }) => (
            <EvidenceMetricRow
              key={`equivalence:${label}:${value}`}
              label={label}
              value={value}
            />
          ))}
        </RABox>
      )}
    </EvidenceSection>
  );
}

export default StatisticalEvidence;
