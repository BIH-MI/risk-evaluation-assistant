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

function hasPersistedDirectIdentifierSummary(attribute = {}) {
  return DIRECT_IDENTIFIER_SUMMARY_FIELDS.some(
    (field) => attribute[field] !== undefined && attribute[field] !== null
  );
}

function copyPersistedDirectIdentifierSummary(attribute = {}) {
  return DIRECT_IDENTIFIER_SUMMARY_FIELDS.reduce((summary, field) => {
    summary[field] = attribute[field] ?? null;
    return summary;
  }, {});
}

/**
 * Maps live Direct Identifier evidence onto the persisted summary columns.
 *
 * New evidence only ever comes from value patterns, so freshly profiled
 * attributes produce "VALUE_PATTERN" or no source. Summaries stored by
 * earlier REA versions ("FIELD_NAME", "FIELD_NAME_AND_VALUE_PATTERN") are
 * historical records: schema-only evidence (no CSV available, e.g. Edit
 * Dataset) carries no new information, so a persisted summary is passed
 * through unchanged rather than recomputed and lost.
 *
 * AI column-name suggestions are never part of this summary.
 */
function buildDirectIdentifierSummary(evidence, existingAttribute = {}) {
  if (!evidence) return undefined;

  if (
    evidence.schemaOnly &&
    hasPersistedDirectIdentifierSummary(existingAttribute)
  ) {
    return copyPersistedDirectIdentifierSummary(existingAttribute);
  }

  const hasValuePatternEvidence = (evidence.sources || []).some((source) =>
    source.startsWith("value-pattern:")
  );
  const hasAutomaticEvidence =
    hasValuePatternEvidence || Boolean(evidence.concept);

  return {
    directIdentifierEvidenceSource: hasValuePatternEvidence
      ? "VALUE_PATTERN"
      : null,
    directIdentifierConcept: evidence.concept ?? null,
    directIdentifierConfidence: hasAutomaticEvidence
      ? evidence.confidence ?? null
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
