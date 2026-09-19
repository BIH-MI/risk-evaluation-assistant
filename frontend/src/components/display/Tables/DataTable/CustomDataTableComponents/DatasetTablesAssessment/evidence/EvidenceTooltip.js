import React from "react";
import CandidateQidNameEvidence from "./CandidateQidEvidence";
import DirectIdentifierNameEvidence from "./DirectIdentifierEvidence";
import {
  EvidenceLine,
  EvidenceSection,
  EvidenceTooltipContainer,
} from "./EvidencePrimitives";
import HistoricalEvidence from "./HistoricalEvidence";
import StatisticalEvidence from "./StatisticalEvidence";
import { hasSemanticEvidenceDetails } from "./evidenceUtils";

function SemanticEvidence({ semantic, t }) {
  if (!hasSemanticEvidenceDetails(semantic)) return null;

  return (
    <EvidenceSection
      title={t("datasetAssessments.evidence.semantic", "Semantic")}
    >
      <EvidenceLine>{semantic.summary || semantic.concept}</EvidenceLine>
    </EvidenceSection>
  );
}

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
      <SemanticEvidence semantic={evidence.semantic} t={t} />
    </EvidenceTooltipContainer>
  );
}

export function NameEvidenceTooltip({ attribute, t }) {
  return (
    <EvidenceTooltipContainer width={350}>
      <DirectIdentifierNameEvidence attribute={attribute} t={t} />
      <CandidateQidNameEvidence
        combinations={attribute.candidateQidCombinations || []}
        t={t}
      />
    </EvidenceTooltipContainer>
  );
}

export default EvidenceTooltip;
