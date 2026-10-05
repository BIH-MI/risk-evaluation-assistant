import React from "react";
import { Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  EvidenceLine,
  EvidenceMetricRow,
  EvidenceSection,
  evidenceTooltipComponentsProps,
} from "./EvidencePrimitives";
import {
  formatMetricNumber,
  hasEvidenceValue,
  hasQuantitativeEvidenceDetails,
} from "./evidenceUtils";

function metricRowsFromValues(rows) {
  return rows
    .filter(([, value]) => hasEvidenceValue(value))
    .map(([label, value]) => ({
      label,
      value: formatMetricNumber(value),
    }));
}

function EvidenceRows({ rows }) {
  return rows.map(({ label, value }) => (
    <EvidenceMetricRow key={`${label}:${value}`} label={label} value={value} />
  ));
}

function IndividualAttributeEvidence({ individual, t }) {
  const rows = metricRowsFromValues([
    [
      t("datasetAssessments.evidence.distinction", "Distinction"),
      individual?.distinction,
    ],
    [
      t("datasetAssessments.evidence.separation", "Separation"),
      individual?.separation,
    ],
    [
      t("datasetAssessments.evidence.singletonFraction", "Singleton fraction"),
      individual?.singletonFraction,
    ],
  ]);

  if (!rows.length) return null;

  return (
    <RABox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <RATypography
        variant="caption"
        color="white"
        fontWeight="bold"
        display="block"
        sx={{ fontSize: "0.72rem", lineHeight: 1.3, opacity: 0.9 }}
      >
        {t(
          "datasetAssessments.evidence.individualAttribute",
          "Individual attribute"
        )}
      </RATypography>
      <EvidenceRows rows={rows} />
    </RABox>
  );
}

function ContextualEvidenceHeading({ t }) {
  const title = t(
    "datasetAssessments.evidence.combinationWithOtherAttributes",
    "In combination with other attributes"
  );
  const description = t(
    "datasetAssessments.evidence.combinationWithOtherAttributesInfo",
    "Averages across evaluated subsets containing this attribute, with each subset size weighted equally."
  );

  return (
    <RABox
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
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
        {title}
      </RATypography>
      <Tooltip
        arrow
        placement="top"
        componentsProps={evidenceTooltipComponentsProps}
        title={description}
      >
        <InfoOutlinedIcon
          aria-label={description}
          tabIndex={0}
          sx={{
            flex: "0 0 auto",
            fontSize: 13,
            color: "white",
            cursor: "help",
            opacity: 0.72,
          }}
        />
      </Tooltip>
    </RABox>
  );
}

// Contextual evidence comes only from subset profiling of the uploaded CSV. It
// is never derived from individual statistics, so when no subset evidence was
// persisted the section says so explicitly instead of disappearing.
function ContextualAttributeEvidence({ overall, t }) {
  const rows = metricRowsFromValues([
    [
      t(
        "datasetAssessments.evidence.averageDistinction",
        "Average Distinction"
      ),
      overall?.meanDistinction,
    ],
    [
      t("datasetAssessments.evidence.averageSeparation", "Average Separation"),
      overall?.meanSeparation,
    ],
    [
      t(
        "datasetAssessments.evidence.averageSingletonFraction",
        "Average Singleton fraction"
      ),
      overall?.meanSingletonFraction,
    ],
  ]);

  return (
    <RABox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <ContextualEvidenceHeading t={t} />
      {rows.length ? (
        <EvidenceRows rows={rows} />
      ) : (
        <EvidenceLine>
          {t(
            "datasetAssessments.evidence.contextualEvidenceUnavailable",
            "Contextual Distinguishability evidence is unavailable for this attribute."
          )}
        </EvidenceLine>
      )}
    </RABox>
  );
}

// Only Distinguishability has quantitative evidence; it comes from aggregate
// profiling statistics persisted with the dataset.
function StatisticalEvidence({ evidence, field, t }) {
  if (field !== "distinguishability") return null;

  const quantitative = evidence.quantitative;
  if (!hasQuantitativeEvidenceDetails(quantitative)) return null;

  return (
    <EvidenceSection
      title={t(
        "datasetAssessments.evidence.quantitativeDistinguishabilityEvidence",
        "Quantitative Distinguishability Evidence"
      )}
    >
      <IndividualAttributeEvidence individual={quantitative.individual} t={t} />
      <ContextualAttributeEvidence
        overall={quantitative.subsetContext?.overall}
        t={t}
      />
    </EvidenceSection>
  );
}

export default StatisticalEvidence;
