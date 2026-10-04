// Persisted attribute fields are aggregate statistics only. Raw rows, observed
// values, frequency maps, encoded columns, partitions, and cache entries stay
// transient in the browser/worker.
const ATTRIBUTE_STATISTIC_FIELDS = [
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

const DIRECT_IDENTIFIER_SUMMARY_FIELDS = [
  "directIdentifierEvidenceSource",
  "directIdentifierConcept",
  "directIdentifierConfidence",
];

const SUBSET_EVIDENCE_FIELDS = [
  "subsetSize",
  "evaluatedSubsetCount",
  "meanDistinction",
  "meanSeparation",
  "meanSingletonFraction",
];

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
    evidence.schemaOnly &&
    hasPersistedValuePatternEvidence(
      existingSummary.directIdentifierEvidenceSource
    );
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

function toDatasetAttributeSubsetEvidencePayload(evidence) {
  return SUBSET_EVIDENCE_FIELDS.reduce((payload, field) => {
    if (evidence?.[field] !== undefined) {
      payload[field] = evidence[field];
    }
    return payload;
  }, {});
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
  };

  ATTRIBUTE_STATISTIC_FIELDS.forEach((field) => {
    if (statistics[field] !== undefined) {
      payload[field] = statistics[field];
    }
  });

  const subsetEvidence = Array.isArray(attribute.subsetEvidence)
    ? attribute.subsetEvidence
    : [];
  payload.subsetEvidence = subsetEvidence.map(
    toDatasetAttributeSubsetEvidencePayload
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
