const distinguishabilityMetricFields = [
  "distinction",
  "separation",
  "singletonFraction",
  "minimumEquivalenceClassSize",
  "medianEquivalenceClassSize",
  "maximumEquivalenceClassSize",
];

const replicabilityEvidenceFields = [
  "replicabilityAvailable",
  "replicabilityScore",
  "replicabilityComparisonCount",
  "replicabilityMethod",
  "replicabilityUnavailableReason",
  "repeatedSubjectCount",
  "repeatedSubjectFraction",
  "analysisUnit",
];

const hasValue = (value) => value !== null && value !== undefined;

function pickExistingFields(source, fields) {
  return fields.reduce((acc, field) => {
    if (hasValue(source?.[field])) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
}

export function buildDistinguishabilityQuantitativeEvidence(attribute) {
  const evidence = pickExistingFields(attribute, distinguishabilityMetricFields);
  return Object.keys(evidence).length > 0 ? evidence : null;
}

export function buildReplicabilityEmpiricalEvidence(attribute) {
  const hasReplicabilityEvidence = replicabilityEvidenceFields.some((field) =>
    hasValue(attribute?.[field])
  );

  if (!hasReplicabilityEvidence) return null;

  const available =
    attribute.replicabilityAvailable === undefined ||
    attribute.replicabilityAvailable === null
      ? hasValue(attribute.replicabilityScore)
      : Boolean(attribute.replicabilityAvailable);

  // An unavailable empirical Replicability score means the dataset could not
  // estimate stability; it does not imply low Replicability.
  const evidence = {
    available,
    score: available ? attribute.replicabilityScore ?? null : null,
    reason: available
      ? null
      : attribute.replicabilityUnavailableReason ?? "unavailable",
  };

  if (hasValue(attribute.replicabilityComparisonCount)) {
    evidence.comparisonCount = attribute.replicabilityComparisonCount;
  }
  if (hasValue(attribute.replicabilityMethod)) {
    evidence.method = attribute.replicabilityMethod;
  }
  if (hasValue(attribute.repeatedSubjectCount)) {
    evidence.repeatedSubjectCount = attribute.repeatedSubjectCount;
  }
  if (hasValue(attribute.repeatedSubjectFraction)) {
    evidence.repeatedSubjectFraction = attribute.repeatedSubjectFraction;
  }
  if (hasValue(attribute.analysisUnit)) {
    evidence.analysisUnit = attribute.analysisUnit;
  }

  return evidence;
}
