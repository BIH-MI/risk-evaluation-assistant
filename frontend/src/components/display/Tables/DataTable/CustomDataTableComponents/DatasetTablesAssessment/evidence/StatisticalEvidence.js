import React from "react";
import RABox from "components/layout/RABox";
import { EvidenceLine, EvidenceSection } from "./EvidencePrimitives";
import {
  formatDistinguishabilityValue,
  hasEvidenceValue,
  hasQuantitativeEvidenceDetails,
} from "./evidenceUtils";

const MISSING_VALUE = "–";

const cellSx = {
  fontSize: "0.8125rem",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

const headerCellSx = {
  ...cellSx,
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "var(--evidence-heading, inherit)",
  pb: 0.5,
  borderBottom: "1px solid var(--evidence-divider, rgba(255, 255, 255, 0.16))",
};

const labelCellSx = {
  ...cellSx,
  color: "var(--evidence-muted, inherit)",
};

const valueCellSx = {
  ...cellSx,
  fontWeight: 600,
  // Explicit: RABox defaults to the theme's dark text colour.
  color: "var(--evidence-value, #F8FAFC)",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const formatValue = (value) =>
  hasEvidenceValue(value) ? formatDistinguishabilityValue(value) : MISSING_VALUE;

/**
 * Measure | Individual | Contextual mean. Individual values are the
 * attribute's own statistics; contextual means are the existing contextual
 * evidence (means over evaluated subsets containing the attribute, each
 * subset size weighted equally). Values are shown as stored.
 */
function DistinguishabilityGrid({ individual, overall, t }) {
  const rows = [
    [
      t("datasetAssessments.evidence.distinction", "Distinction"),
      individual?.distinction,
      overall?.meanDistinction,
    ],
    [
      t("datasetAssessments.evidence.separation", "Separation"),
      individual?.separation,
      overall?.meanSeparation,
    ],
    [
      t("datasetAssessments.evidence.singletonFraction", "Singleton fraction"),
      individual?.singletonFraction,
      overall?.meanSingletonFraction,
    ],
  ];

  return (
    <RABox
      role="table"
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(max-content, 1fr) auto auto",
        columnGap: 2.5,
        rowGap: 0.375,
        alignItems: "baseline",
      }}
    >
      <RABox role="columnheader" sx={headerCellSx}>
        {t("datasetAssessments.evidence.measure", "Measure")}
      </RABox>
      <RABox role="columnheader" sx={{ ...headerCellSx, textAlign: "right" }}>
        {t("datasetAssessments.evidence.individual", "Individual")}
      </RABox>
      <RABox role="columnheader" sx={{ ...headerCellSx, textAlign: "right" }}>
        {t("datasetAssessments.evidence.contextualMean", "Contextual mean")}
      </RABox>
      {rows.map(([label, individualValue, combinationValue]) => (
        <React.Fragment key={label}>
          <RABox role="rowheader" sx={labelCellSx}>
            {label}
          </RABox>
          <RABox role="cell" sx={valueCellSx}>
            {formatValue(individualValue)}
          </RABox>
          <RABox role="cell" sx={valueCellSx}>
            {formatValue(combinationValue)}
          </RABox>
        </React.Fragment>
      ))}
    </RABox>
  );
}

// Only Distinguishability has quantitative evidence; it comes from aggregate
// profiling statistics persisted with the dataset. Combination means come
// only from subset profiling and are never derived from individual values.
function StatisticalEvidence({ evidence, field, t }) {
  if (field !== "distinguishability") return null;

  const quantitative = evidence.quantitative;
  if (!hasQuantitativeEvidenceDetails(quantitative)) return null;

  const overall = quantitative.subsetContext?.overall;
  const hasCombinationEvidence = [
    overall?.meanDistinction,
    overall?.meanSeparation,
    overall?.meanSingletonFraction,
  ].some(hasEvidenceValue);

  return (
    <EvidenceSection
      centerTitle
      title={t(
        "datasetAssessments.evidence.distinguishabilityEvidence",
        "Distinguishability Evidence"
      )}
    >
      <DistinguishabilityGrid
        individual={quantitative.individual}
        overall={overall}
        t={t}
      />
      {!hasCombinationEvidence && (
        <EvidenceLine>
          {t(
            "datasetAssessments.evidence.contextualEvidenceUnavailable",
            "Contextual Distinguishability evidence is unavailable for this attribute."
          )}
        </EvidenceLine>
      )}
    </EvidenceSection>
  );
}

export default StatisticalEvidence;
