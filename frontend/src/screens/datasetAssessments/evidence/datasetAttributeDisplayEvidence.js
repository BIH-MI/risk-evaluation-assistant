function buildDisplayEvidence(attribute) {
  return {
    directIdentifierEvidenceSource:
      attribute.directIdentifierEvidenceSource ?? null,
    directIdentifierConcept: attribute.directIdentifierConcept ?? null,
    directIdentifierConfidence:
      attribute.directIdentifierConfidence ?? null,
  };
}

export function buildDatasetAttributeDisplayEvidence(table) {
  const displayEvidenceByAttributeId = new Map();

  (table.attributes || []).forEach((attribute) => {
    if (attribute.id === null || attribute.id === undefined) return;

    displayEvidenceByAttributeId.set(
      String(attribute.id),
      buildDisplayEvidence(attribute)
    );
  });

  return displayEvidenceByAttributeId;
}
