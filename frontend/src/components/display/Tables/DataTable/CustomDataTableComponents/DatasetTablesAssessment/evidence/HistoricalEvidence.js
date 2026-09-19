import React from "react";
import { getOptionsForAttributeField } from "utils/AttributeScale";
import {
  EvidenceMetricRow,
  EvidenceSection,
} from "./EvidencePrimitives";
import {
  formatMetricNumber,
  formatScaleLabel,
  hasEvidenceValue,
} from "./evidenceUtils";

export function buildHistoricalEvidenceSummary(
  historical,
  field,
  scoringSystem
) {
  const observations = historical?.observations || [];
  const countsByLabel = new Map();
  const optionOrderByValue = new Map(
    getOptionsForAttributeField(field, scoringSystem).map((option, index) => [
      String(option.value),
      index,
    ])
  );

  observations.forEach((observation) => {
    const label =
      observation.valueLabel ||
      formatScaleLabel(observation.value, field, scoringSystem);
    if (!hasEvidenceValue(label)) return;

    const key = hasEvidenceValue(observation.value)
      ? String(observation.value)
      : String(label);
    const existingCount = countsByLabel.get(key)?.count || 0;

    countsByLabel.set(key, {
      label,
      value: observation.value,
      count: existingCount + 1,
    });
  });

  return Array.from(countsByLabel.values())
    .filter(({ count }) => count > 0)
    .sort((left, right) => {
      const countDiff = right.count - left.count;
      if (countDiff !== 0) return countDiff;

      const leftOrder =
        optionOrderByValue.get(String(left.value)) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        optionOrderByValue.get(String(right.value)) ?? Number.MAX_SAFE_INTEGER;
      return (
        leftOrder - rightOrder || String(left.label).localeCompare(right.label)
      );
    });
}

function HistoricalEvidence({ historical, field, scoringSystem, t }) {
  const summary = buildHistoricalEvidenceSummary(
    historical,
    field,
    scoringSystem
  );
  if (!summary.length) return null;

  return (
    <EvidenceSection
      title={t(
        "datasetAssessments.evidence.historicalEvidence",
        "Historical Evidence"
      )}
    >
      {summary.map(({ label, count }) => (
        <EvidenceMetricRow
          key={`${label}:${count}`}
          label={label}
          value={t("datasetAssessments.evidence.assessmentCount", {
            count,
            displayCount: formatMetricNumber(count),
            defaultValue:
              count === 1
                ? "{{displayCount}} assessment"
                : "{{displayCount}} assessments",
          })}
        />
      ))}
    </EvidenceSection>
  );
}

export default HistoricalEvidence;
