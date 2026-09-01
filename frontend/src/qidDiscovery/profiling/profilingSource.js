import { profileAndEncodeColumn } from "./profileAndEncodeColumn";
import { applyDirectIdentifierEvidenceDefaults } from "../directIdentifierPolicy";
import { buildDirectIdentifierEvidenceForCurrentFieldName } from "./directIdentifierEvidence";
import {
  getReplicabilityEvidenceForSourceField,
  refreshReplicabilityEvidence,
  suggestSubjectKeySourceFields,
} from "./replicabilityEvidence";

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

const getProfiledSourceForColumn = (profilingSource, column = {}) => {
  const sourceField = column.sourceField || column.field;
  const source = profilingSource?.columnsBySourceField?.get(sourceField);

  return source
    ? {
        sourceField,
        source,
      }
    : null;
};

function getSourceField(column, rows) {
  if (column.sourceField) return column.sourceField;
  if (column.hasObservedData === true) return column.field;
  if (rows?.length && hasOwn(rows[0] || {}, column.field)) return column.field;
  return null;
}

/**
 * Creates initial column metadata from parsed CSV headers. The display name
 * and source identity start as the same value; later user renames update
 * field while sourceField remains stable for cache reuse.
 */
export function createColumnMetaFromFields(fields = []) {
  return fields.map((field) => ({
    field,
    sourceField: field,
    hasObservedData: true,
    level: null,
    excluded: false,
  }));
}

/**
 * Builds the reusable profiling source for one uploaded table. Each observed
 * source column is normalized, profiled, encoded, and checked for aggregate
 * Direct Identifier evidence once. Later schema edits reuse this object so
 * excluded identifiers can still support Replicability without rescanning rows.
 */
export function buildProfilingSource(rows = [], columnMeta = [], options = {}) {
  const profileColumn = options.profileColumn || profileAndEncodeColumn;
  const columnsBySourceField = new Map();

  for (const column of columnMeta) {
    const sourceField = getSourceField(column, rows);
    if (!sourceField || columnsBySourceField.has(sourceField)) continue;

    columnsBySourceField.set(
      sourceField,
      profileColumn(rows, sourceField, {
        directIdentifierEvidence: options.directIdentifierEvidence || {},
      })
    );
  }

  const profilingSource = {
    recordCount: rows.length,
    columnsBySourceField,
    suggestedSubjectKeySourceFields: suggestSubjectKeySourceFields(
      Array.from(columnsBySourceField.keys())
    ),
    subjectKeySourceField: null,
    repeatedMeasurementSummary: null,
    replicabilityCache: null,
    combinationCache: null,
  };

  refreshReplicabilityEvidence(
    profilingSource,
    options.subjectKeySourceField || null
  );

  return profilingSource;
}

/**
 * Updates only the Replicability-related cache when the selected subject key
 * changes. Subject grouping is independent of `excluded`: an excluded
 * identifier can still group repeated observations because encoded source
 * columns remain in the transient profiling source.
 */
export function updateSubjectKeySourceField(
  profilingSource,
  subjectKeySourceField
) {
  refreshReplicabilityEvidence(profilingSource, subjectKeySourceField || null);
  return {
    subjectKeySourceField: profilingSource.subjectKeySourceField,
    repeatedMeasurementSummary: profilingSource.repeatedMeasurementSummary,
  };
}

/**
 * Applies cached per-attribute statistics back onto the current schema. This
 * function is intentionally cheap and may run after rename, exclude/include,
 * delete, or datatype display edits. It does not inspect raw rows.
 */
export function applyStatistics(
  columnMeta = [],
  profilingSource,
  options = {}
) {
  return columnMeta.map((column) => {
    const profiledSource = getProfiledSourceForColumn(profilingSource, column);
    const sourceField =
      profiledSource?.sourceField || column.sourceField || column.field;
    const source = profiledSource?.source;
    const directIdentifierEvidence =
      source || column.directIdentifierEvidence
        ? buildDirectIdentifierEvidenceForCurrentFieldName(
            column.field,
            source?.directIdentifierEvidence || column.directIdentifierEvidence,
            options.directIdentifierEvidence || {}
          )
        : null;
    const columnWithDirectIdentifierDefaults =
      applyDirectIdentifierEvidenceDefaults(column, directIdentifierEvidence, {
        resetDecisionOnConceptChange: true,
      });

    return {
      ...columnWithDirectIdentifierDefaults,
      // `sourceField` remains stable after a rename so cached encoded data can be reused.
      sourceField: source ? sourceField : column.sourceField || null,
      hasObservedData: Boolean(source),
      level: column.level || source?.dataType || "STRING",
      statistics: source ? source.statistics : column.statistics || null,
      directIdentifierEvidence,
      replicabilityEvidence: source
        ? getReplicabilityEvidenceForSourceField(profilingSource, sourceField)
        : column.replicabilityEvidence || {
            empirical: null,
            semantic: null,
            historical: null,
          },
    };
  });
}

/**
 * Builds the QID search input from current schema state. Candidate preparation
 * deliberately checks only two things: a profiled source column exists, and the
 * user has not marked the attribute `excluded`.
 */
export function buildCandidateColumns(columnMeta = [], profilingSource) {
  return columnMeta
    .map((column) => {
      if (column.excluded === true) return null;

      const profiledSource = getProfiledSourceForColumn(
        profilingSource,
        column
      );
      if (!profiledSource) return null;

      const { source } = profiledSource;

      return {
        attributeName: column.field,
        sourceField: source.sourceField,
        stableAttributeId: source.stableAttributeId,
        codes: source.encoded.codes,
      };
    })
    .filter(Boolean);
}
