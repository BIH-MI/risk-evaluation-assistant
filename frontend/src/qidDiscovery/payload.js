// Persisted attribute fields are aggregate statistics only. Raw rows, observed
// values, frequency maps, encoded columns, partitions, and cache entries stay
// transient in the browser/worker.
export const ATTRIBUTE_STATISTIC_FIELDS = [
  "recordCount",
  "analysedRecordCount",
  "missingCount",
  "missingFraction",
  "distinctValueCount",
  "distinctValueRatio",
  "singletonValueCount",
  "singletonRecordCount",
  "singletonFraction",
  "minimumEquivalenceClassSize",
  "medianEquivalenceClassSize",
  "maximumEquivalenceClassSize",
  "distinction",
  "separation",
];

// Flattened field names for the empirical Replicability evidence
// (`column.replicabilityEvidence.empirical`, see profiling/replicabilityEvidence.js).
// `semantic`/`historical` evidence is not implemented yet and has no fields here.
export const REPLICABILITY_ATTRIBUTE_FIELDS = [
  "replicabilityAvailable",
  "replicabilityScore",
  "replicabilityComparisonCount",
  "replicabilityMethod",
  "replicabilityUnavailableReason",
];

export const QID_COMBINATION_STATISTIC_FIELDS = [
  "attributeCount",
  "distinction",
  "separation",
  "equivalenceClassCount",
  "singletonClassCount",
  "singletonRecordCount",
  "singletonFraction",
  "minimumEquivalenceClassSize",
  "medianEquivalenceClassSize",
  "maximumEquivalenceClassSize",
];

export const QID_COMBINATION_EVIDENCE_FIELDS = [
  "targetSatisfied",
  "minimalQualifying",
];

export const DIRECT_IDENTIFIER_SUMMARY_FIELDS = [
  "directIdentifierEvidenceSource",
  "directIdentifierConcept",
  "directIdentifierConfidence",
];

// `empirical` is only present once a subject key with repeated measurements
// is selected; `undefined` here leaves the flattened fields absent from the
// payload rather than persisting a misleading `null`.
function flattenEmpiricalReplicability(empirical) {
  if (!empirical) return {};

  return {
    replicabilityAvailable: empirical.available,
    replicabilityScore: empirical.score,
    replicabilityComparisonCount: empirical.comparisonCount,
    replicabilityMethod: empirical.method,
    replicabilityUnavailableReason: empirical.reason ?? null,
  };
}

function hasPersistedValuePatternEvidence(source) {
  return (
    source === "VALUE_PATTERN" || source === "FIELD_NAME_AND_VALUE_PATTERN"
  );
}

function buildDirectIdentifierSummary(evidence, existingSummary = {}) {
  if (!evidence) return undefined;

  const sources = evidence.sources || [];
  const hasFieldNameEvidence = sources.some((source) =>
    source.startsWith("field-name:")
  );
  const hasLiveValuePatternEvidence = sources.some((source) =>
    source.startsWith("value-pattern:")
  );
  const hasPersistedValuePatternSummary =
    (evidence.schemaOnly &&
      hasPersistedValuePatternEvidence(
        existingSummary.directIdentifierEvidenceSource
      ));
  const hasValuePatternEvidence =
    hasLiveValuePatternEvidence || hasPersistedValuePatternSummary;
  const directIdentifierEvidenceSource =
    hasFieldNameEvidence && hasValuePatternEvidence
      ? "FIELD_NAME_AND_VALUE_PATTERN"
      : hasFieldNameEvidence
      ? "FIELD_NAME"
      : hasValuePatternEvidence
      ? "VALUE_PATTERN"
      : null;
  const hasAutomaticEvidence =
    Boolean(directIdentifierEvidenceSource) || Boolean(evidence.concept);

  return {
    directIdentifierEvidenceSource,
    directIdentifierConcept:
      evidence.concept ??
      (hasValuePatternEvidence
        ? existingSummary.directIdentifierConcept ?? null
        : null),
    directIdentifierConfidence: hasAutomaticEvidence
      ? hasPersistedValuePatternSummary && !hasFieldNameEvidence
        ? existingSummary.directIdentifierConfidence ?? evidence.confidence ?? null
        : evidence.confidence ??
          existingSummary.directIdentifierConfidence ??
          null
      : null,
  };
}

/**
 * Converts UI attribute metadata into the dataset API payload.
 */
export function toDatasetAttributePayload(attribute) {
  const payload = {
    id: typeof attribute.id === "string" ? null : attribute.id,
    name: attribute.field || attribute.name,
    dataType: attribute.level || attribute.dataType,
    excluded: Boolean(attribute.excluded ?? attribute.isExcluded),
  };
  const statistics = {
    ...(attribute.statistics || attribute),
    // Edit Dataset attributes carry these as flat fields already returned by
    // the backend; Add Dataset attributes carry live evidence to flatten here.
    ...flattenEmpiricalReplicability(attribute.replicabilityEvidence?.empirical),
  };

  [...ATTRIBUTE_STATISTIC_FIELDS, ...REPLICABILITY_ATTRIBUTE_FIELDS].forEach(
    (field) => {
      if (statistics[field] !== undefined) {
        payload[field] = statistics[field];
      }
    }
  );

  const directIdentifierSummary = buildDirectIdentifierSummary(
    attribute.directIdentifierEvidence,
    attribute
  );

  if (directIdentifierSummary) {
    Object.assign(payload, directIdentifierSummary);
  } else {
    DIRECT_IDENTIFIER_SUMMARY_FIELDS.forEach((field) => {
      if (attribute[field] !== undefined) {
        payload[field] = attribute[field];
      }
    });
  }

  return payload;
}

/**
 * Converts a selected QID combination into the dataset API payload.
 */
export function toDatasetQidCombinationPayload(combination) {
  const payload = {};

  if (combination.id !== undefined) payload.id = combination.id;
  if (combination.attributeIds !== undefined) {
    payload.attributeIds = combination.attributeIds;
  }
  if (combination.attributeNames !== undefined) {
    payload.attributeNames = combination.attributeNames;
  }

  QID_COMBINATION_STATISTIC_FIELDS.forEach((field) => {
    if (combination[field] !== undefined) {
      payload[field] = combination[field];
    }
  });

  QID_COMBINATION_EVIDENCE_FIELDS.forEach((field) => {
    if (combination[field] !== undefined) {
      payload[field] = combination[field];
    }
  });

  return payload;
}
