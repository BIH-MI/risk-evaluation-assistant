import React from "react";
import DirectIdentifierNameEvidence from "./DirectIdentifierEvidence";
import { EvidenceTooltipContainer } from "./EvidencePrimitives";
import HistoricalEvidence from "./HistoricalEvidence";
import StatisticalEvidence from "./StatisticalEvidence";

function EvidenceTooltip({ evidence, field, scoringSystem, t }) {
  return (
    <EvidenceTooltipContainer width={320}>
      <StatisticalEvidence evidence={evidence} field={field} t={t} />
      <HistoricalEvidence
        historical={evidence.historical}
        field={field}
        scoringSystem={scoringSystem}
        t={t}
      />
    </EvidenceTooltipContainer>
  );
}

export function NameEvidenceTooltip({ attribute, t }) {
  return (
    <EvidenceTooltipContainer width={350}>
      <DirectIdentifierNameEvidence attribute={attribute} t={t} />
    </EvidenceTooltipContainer>
  );
}

export default EvidenceTooltip;
