const hasValue = (value) => value !== null && value !== undefined;

export function isCandidateQidCombination(combination) {
  return (
    combination?.minimalQualifying === true ||
    combination?.candidateCombination === true
  );
}

export function toDisplayCandidateCombination(combination) {
  return {
    id: combination.id ?? null,
    attributeIds: combination.attributeIds || [],
    attributeNames: combination.attributeNames || [],
    distinction: combination.distinction,
    separation: combination.separation,
    singletonFraction: combination.singletonFraction,
    minimumEquivalenceClassSize: combination.minimumEquivalenceClassSize,
    maximumEquivalenceClassSize: combination.maximumEquivalenceClassSize,
  };
}

export function buildCandidateQidCombinationsByAttributeId(table) {
  const combinationsByAttributeId = new Map();
  const attributesByName = new Map(
    (table.attributes || []).map((attribute) => [attribute.name, attribute])
  );

  (table.qidCombinations || [])
    .filter(isCandidateQidCombination)
    .forEach((combination) => {
      const displayCombination = toDisplayCandidateCombination(combination);
      const attributeIds = (combination.attributeIds || []).filter(hasValue);
      const referencedAttributeIds =
        attributeIds.length > 0
          ? attributeIds
          : (combination.attributeNames || [])
              .map((name) => attributesByName.get(name)?.id)
              .filter(hasValue);

      referencedAttributeIds.forEach((attributeId) => {
        const key = String(attributeId);
        const current = combinationsByAttributeId.get(key) || [];
        combinationsByAttributeId.set(key, [...current, displayCombination]);
      });
    });

  return combinationsByAttributeId;
}

function buildDisplayEvidence(attribute, candidateQidCombinations = []) {
  return {
    directIdentifierEvidenceSource:
      attribute.directIdentifierEvidenceSource ?? null,
    directIdentifierConcept: attribute.directIdentifierConcept ?? null,
    directIdentifierConfidence:
      attribute.directIdentifierConfidence ?? null,
    candidateQidCombinations,
  };
}

export function buildDatasetAttributeDisplayEvidence(table) {
  const candidateQidCombinationsByAttributeId =
    buildCandidateQidCombinationsByAttributeId(table);
  const displayEvidenceByAttributeId = new Map();

  (table.attributes || []).forEach((attribute) => {
    if (attribute.id === null || attribute.id === undefined) return;

    const key = String(attribute.id);
    displayEvidenceByAttributeId.set(
      key,
      buildDisplayEvidence(
        attribute,
        candidateQidCombinationsByAttributeId.get(key) || []
      )
    );
  });

  return displayEvidenceByAttributeId;
}
