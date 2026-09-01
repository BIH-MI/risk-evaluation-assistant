import { normalizeFieldName } from "./directIdentifierEvidence";

const LIKELY_SUBJECT_KEY_PATTERNS = [
  "subject_id",
  "patient_id",
  "participant_id",
  "person_id",
];

const EXACT_AGREEMENT_DATA_TYPES = new Set(["BOOLEAN", "DATETIME", "STRING"]);

const pairCount = (count) => (count * (count - 1)) / 2;

function emptyReplicabilityEvidence() {
  return {
    empirical: null,
    semantic: null,
    historical: null,
  };
}

/**
 * Returns likely subject/entity identifier fields based on conservative name
 * patterns. These are suggestions only; they must not silently become the
 * authoritative subject grouping key.
 */
export function suggestSubjectKeySourceFields(sourceFields = []) {
  const suggestedKeys = new Set(LIKELY_SUBJECT_KEY_PATTERNS);

  return sourceFields.filter((sourceField) => {
    const normalized = normalizeFieldName(sourceField);
    return (
      suggestedKeys.has(normalized.key) || suggestedKeys.has(normalized.rawKey)
    );
  });
}

/**
 * Groups row indices by the encoded values of an explicitly selected subject
 * key. Missing subject-key rows are ignored. The returned row-index groups are
 * transient profiling-session state and must never be persisted or sent to the
 * backend. The selected subject key may be excluded from QID search; exclusion
 * does not remove its encoded source column from profiling.
 */
export function buildSubjectGrouping(profilingSource, subjectKeySourceField) {
  const subjectProfile = profilingSource?.columnsBySourceField?.get(
    subjectKeySourceField
  );

  if (!subjectKeySourceField || !subjectProfile) {
    return {
      subjectKeySourceField: subjectKeySourceField || null,
      hasRepeatedMeasurements: false,
      subjectCount: 0,
      subjectsWithRepeatedMeasurements: 0,
      repeatedSubjectFraction: 0,
      observationCount: profilingSource?.recordCount || 0,
      groupsBySubjectCode: new Map(),
    };
  }

  const groupsBySubjectCode = new Map();
  const subjectCodes = subjectProfile.encoded.codes;
  const missingSubjectCode = subjectProfile.encoded.missingCode;
  let groupedObservationCount = 0;

  for (let rowIndex = 0; rowIndex < subjectCodes.length; rowIndex += 1) {
    const subjectCode = subjectCodes[rowIndex];
    if (missingSubjectCode !== null && subjectCode === missingSubjectCode) {
      continue;
    }

    if (!groupsBySubjectCode.has(subjectCode)) {
      groupsBySubjectCode.set(subjectCode, []);
    }

    groupsBySubjectCode.get(subjectCode).push(rowIndex);
    groupedObservationCount += 1;
  }

  const subjectCount = groupsBySubjectCode.size;
  const subjectsWithRepeatedMeasurements = Array.from(
    groupsBySubjectCode.values()
  ).filter((rowIndices) => rowIndices.length > 1).length;

  return {
    subjectKeySourceField,
    hasRepeatedMeasurements: subjectsWithRepeatedMeasurements > 0,
    subjectCount,
    subjectsWithRepeatedMeasurements,
    repeatedSubjectFraction: subjectCount
      ? subjectsWithRepeatedMeasurements / subjectCount
      : 0,
    observationCount: groupedObservationCount,
    groupsBySubjectCode,
  };
}

function toSubjectGroupingSummary(subjectGrouping) {
  if (!subjectGrouping) return null;

  return {
    subjectKeySourceField: subjectGrouping.subjectKeySourceField,
    hasRepeatedMeasurements: subjectGrouping.hasRepeatedMeasurements,
    subjectCount: subjectGrouping.subjectCount,
    subjectsWithRepeatedMeasurements:
      subjectGrouping.subjectsWithRepeatedMeasurements,
    repeatedSubjectFraction: subjectGrouping.repeatedSubjectFraction,
    observationCount: subjectGrouping.observationCount,
  };
}

function unavailableEmpiricalEvidence(subjectGrouping, reason, dataType) {
  return {
    available: false,
    score: null,
    subjectCount: subjectGrouping.subjectCount,
    repeatedSubjectCount: subjectGrouping.subjectsWithRepeatedMeasurements,
    repeatedSubjectFraction: subjectGrouping.repeatedSubjectFraction,
    observationCount: subjectGrouping.observationCount,
    comparisonCount: 0,
    method: null,
    reason,
    dataType,
    analysisUnit: "SUBJECT",
  };
}

/**
 * Calculates empirical Replicability for categorical/discrete attributes using
 * within-subject exact agreement:
 *
 * equal within-subject comparisons / valid within-subject comparisons.
 *
 * Continuous datatypes intentionally return unavailable evidence until a
 * validated continuous stability measure such as ICC or within-subject
 * variance is implemented.
 */
export function calculateAttributeReplicabilityEvidence(
  attributeProfile,
  subjectGrouping
) {
  const evidence = emptyReplicabilityEvidence();

  if (!subjectGrouping?.hasRepeatedMeasurements) {
    return evidence;
  }

  if (!EXACT_AGREEMENT_DATA_TYPES.has(attributeProfile.dataType)) {
    return {
      ...evidence,
      empirical: unavailableEmpiricalEvidence(
        subjectGrouping,
        "unsupported_data_type",
        attributeProfile.dataType
      ),
    };
  }

  const attributeCodes = attributeProfile.encoded.codes;
  const missingAttributeCode = attributeProfile.encoded.missingCode;
  let comparisonCount = 0;
  let equalComparisonCount = 0;

  subjectGrouping.groupsBySubjectCode.forEach((rowIndices) => {
    if (rowIndices.length < 2) return;

    const valueCounts = {};
    let validObservationCount = 0;

    rowIndices.forEach((rowIndex) => {
      const attributeCode = attributeCodes[rowIndex];
      if (
        missingAttributeCode !== null &&
        attributeCode === missingAttributeCode
      ) {
        return;
      }

      valueCounts[attributeCode] = (valueCounts[attributeCode] || 0) + 1;
      validObservationCount += 1;
    });

    comparisonCount += pairCount(validObservationCount);
    Object.values(valueCounts).forEach((count) => {
      equalComparisonCount += pairCount(count);
    });
  });

  if (!comparisonCount) {
    return {
      ...evidence,
      empirical: unavailableEmpiricalEvidence(
        subjectGrouping,
        "insufficient_valid_comparisons",
        attributeProfile.dataType
      ),
    };
  }

  return {
    ...evidence,
    empirical: {
      available: true,
      score: equalComparisonCount / comparisonCount,
      subjectCount: subjectGrouping.subjectCount,
      repeatedSubjectCount: subjectGrouping.subjectsWithRepeatedMeasurements,
      repeatedSubjectFraction: subjectGrouping.repeatedSubjectFraction,
      observationCount: subjectGrouping.observationCount,
      comparisonCount,
      method: "within_subject_exact_agreement",
      dataType: attributeProfile.dataType,
      analysisUnit: "SUBJECT",
    },
  };
}

/**
 * Ensures Replicability evidence exists for the current optional subject key.
 * Reuses cached evidence when the subject key has not changed. When the key
 * changes, only the subject-grouping cache is rebuilt; QID combination cache
 * entries remain reusable because encoded source columns are unchanged.
 */
export function refreshReplicabilityEvidence(
  profilingSource,
  subjectKeySourceField
) {
  if (!profilingSource) return null;

  const normalizedSubjectKeySourceField =
    subjectKeySourceField &&
    profilingSource.columnsBySourceField?.has(subjectKeySourceField)
      ? subjectKeySourceField
      : null;
  if (
    profilingSource.replicabilityCache &&
    profilingSource.replicabilityCache.subjectKeySourceField ===
      normalizedSubjectKeySourceField
  ) {
    return profilingSource.replicabilityCache.summary;
  }

  const subjectGrouping = buildSubjectGrouping(
    profilingSource,
    normalizedSubjectKeySourceField
  );
  const evidenceBySourceField = new Map();

  profilingSource.columnsBySourceField.forEach(
    (attributeProfile, sourceField) => {
      if (
        normalizedSubjectKeySourceField &&
        sourceField === normalizedSubjectKeySourceField
      ) {
        evidenceBySourceField.set(sourceField, emptyReplicabilityEvidence());
        return;
      }

      evidenceBySourceField.set(
        sourceField,
        calculateAttributeReplicabilityEvidence(
          attributeProfile,
          subjectGrouping
        )
      );
    }
  );

  const summary = toSubjectGroupingSummary(subjectGrouping);
  profilingSource.subjectKeySourceField = normalizedSubjectKeySourceField;
  profilingSource.repeatedMeasurementSummary = summary;
  profilingSource.replicabilityCache = {
    subjectKeySourceField: normalizedSubjectKeySourceField,
    subjectGrouping,
    summary,
    evidenceBySourceField,
  };

  return summary;
}

/**
 * Retrieves cached evidence for one source field. The evidence contains
 * subject-level aggregate counts only, never subject IDs or value sequences.
 */
export function getReplicabilityEvidenceForSourceField(
  profilingSource,
  sourceField
) {
  if (
    !profilingSource?.replicabilityCache?.evidenceBySourceField ||
    !profilingSource.columnsBySourceField?.has(sourceField)
  ) {
    return emptyReplicabilityEvidence();
  }

  return (
    profilingSource.replicabilityCache.evidenceBySourceField.get(sourceField) ||
    emptyReplicabilityEvidence()
  );
}
