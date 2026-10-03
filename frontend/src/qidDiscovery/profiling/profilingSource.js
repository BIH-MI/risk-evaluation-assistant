import { profileAndEncodeColumn } from "./profileAndEncodeColumn";
import { applyDirectIdentifierEvidenceDefaults } from "../directIdentifierPolicy";
import { buildDirectIdentifierEvidenceForCurrentFieldName } from "./directIdentifierEvidence";
import { shouldAutoExcludeDirectIdentifier } from "./directIdentifierEvidence";

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
 * attribute subset profiling can refresh without rescanning rows.
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
        directIdentifier: options.directIdentifier,
      })
    );
  }

  const profilingSource = {
    recordCount: rows.length,
    columnsBySourceField,
    subsetPartitionCache: null,
  };

  return profilingSource;
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
            options.directIdentifier
          )
        : null;
    const columnWithDirectIdentifierDefaults =
      applyDirectIdentifierEvidenceDefaults(
        column,
        directIdentifierEvidence,
        options.directIdentifier,
        {
          resetDecisionOnConceptChange: true,
        }
      );

    return {
      ...columnWithDirectIdentifierDefaults,
      // `sourceField` remains stable after a rename so cached encoded data can be reused.
      sourceField: source ? sourceField : column.sourceField || null,
      hasObservedData: Boolean(source),
      level: column.level || source?.dataType || "STRING",
      statistics: source ? source.statistics : column.statistics || null,
      directIdentifierEvidence,
    };
  });
}

/**
 * Builds the subset-profiling input from current schema state. Candidate
 * preparation keeps Direct Identifier detection separate: excluded columns and
 * confirmed Direct Identifiers are omitted from quantitative subset profiling.
 */
export function buildCandidateColumns(columnMeta = [], profilingSource) {
  return columnMeta
    .map((column) => {
      if (column.excluded === true) return null;
      if (shouldAutoExcludeDirectIdentifier(column.directIdentifierEvidence)) {
        return null;
      }

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
