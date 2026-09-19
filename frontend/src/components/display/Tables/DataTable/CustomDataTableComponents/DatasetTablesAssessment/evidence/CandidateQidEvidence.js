import React from "react";
import { alpha } from "@mui/material/styles";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  EvidenceDivider,
  EvidenceMetricRow,
  EvidenceSection,
  getEvidenceTooltipTextColor,
} from "./EvidencePrimitives";
import { formatMetricNumber, hasEvidenceValue } from "./evidenceUtils";

export function getCandidateCombinationAttributes(combination) {
  const names = combination.attributeNames || [];
  const attributes = names.length > 0 ? names : combination.attributeIds || [];
  return attributes.map((attribute) => String(attribute)).filter(Boolean);
}

export function getCandidateCombinationKey(combination, index) {
  return (
    combination.id ??
    `${index}:${getCandidateCombinationAttributes(combination).join("|")}`
  );
}

export function CandidateCombinationAttributeList({ attributes }) {
  return (
    <RABox
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.25,
        minWidth: 0,
      }}
    >
      {attributes.map((attribute, index) => (
        <RATypography
          key={`${index}:${attribute}`}
          variant="caption"
          color="white"
          display="block"
          sx={{
            lineHeight: 1.3,
            opacity: 0.86,
            overflowWrap: "anywhere",
            whiteSpace: "normal",
          }}
        >
          {index === 0 ? attribute : `+ ${attribute}`}
        </RATypography>
      ))}
    </RABox>
  );
}

function CandidateQidNameEvidence({ combinations = [], t }) {
  if (!combinations.length) return null;

  return (
    <EvidenceSection
      title={t(
        "datasetAssessments.evidence.candidateQidEvidence",
        "Candidate QID Evidence"
      )}
    >
      {combinations.map((combination, index) => {
        const attributes = getCandidateCombinationAttributes(combination);

        return (
          <React.Fragment key={getCandidateCombinationKey(combination, index)}>
            <RABox
              sx={(theme) => ({
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                p: 1,
                borderRadius: "8px",
                border: `1px solid ${alpha(
                  getEvidenceTooltipTextColor(theme),
                  0.12
                )}`,
                bgcolor: alpha(getEvidenceTooltipTextColor(theme), 0.04),
                minWidth: 0,
              })}
            >
              <RATypography
                variant="caption"
                color="white"
                fontWeight="bold"
                display="block"
                sx={{
                  lineHeight: 1.25,
                  overflowWrap: "anywhere",
                }}
              >
                {t("datasetAssessments.evidence.combinationIndex", {
                  index: index + 1,
                  defaultValue: "Combination {{index}}",
                })}
              </RATypography>
              {attributes.length > 0 && (
                <CandidateCombinationAttributeList attributes={attributes} />
              )}
              <RABox
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  minWidth: 0,
                }}
              >
                {hasEvidenceValue(combination.distinction) && (
                  <EvidenceMetricRow
                    label={t(
                      "datasetAssessments.evidence.distinction",
                      "Distinction"
                    )}
                    value={formatMetricNumber(combination.distinction)}
                  />
                )}
                {hasEvidenceValue(combination.separation) && (
                  <EvidenceMetricRow
                    label={t(
                      "datasetAssessments.evidence.separation",
                      "Separation"
                    )}
                    value={formatMetricNumber(combination.separation)}
                  />
                )}
              </RABox>
            </RABox>
            {index < combinations.length - 1 && <EvidenceDivider />}
          </React.Fragment>
        );
      })}
    </EvidenceSection>
  );
}

export default CandidateQidNameEvidence;
