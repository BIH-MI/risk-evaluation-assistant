import { profileAndEncodeColumn } from "./profileAndEncodeColumn";
import { buildDirectIdentifierEvidenceForCurrentFieldName } from "./directIdentifierEvidence";
import {
  applyDirectIdentifierEvidenceDefaults,
  shouldAutoExcludeDirectIdentifier,
} from "../directIdentifierPolicy";

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
 * One uploaded column after the single profiling pass.
 *
 * @typedef {Object} ProfiledColumn
 * @property {string} sourceField Original uploaded column name. This is the
 * stable identity of the column: a rename changes the display name (`field`)
 * in column metadata, never the sourceField.
 * @property {Object} statistics Persistable individual attribute statistics.
 * @property {{ sourceField: string, codes: Uint32Array, distinctCodeCount: number, missingCode: number|null }} encoded
 * Browser-local encoded values used for subset profiling.
 * @property {string} dataType Detected data type.
 * @property {import("./directIdentifierEvidence").DirectIdentifierEvidence} directIdentifierEvidence
 * Evidence observed under the original source field name; re-evaluated for the
 * current display name on every refresh.
 */

/**
 * Transient browser-local profiling state for one uploaded table. Reused for
 * every refresh of the table and never persisted.
 *
 * @typedef {Object} ProfilingSource
 * @property {number} recordCount Number of parsed rows (one row = one individual).
 * @property {Map<string, ProfiledColumn>} columnsBySourceField
 * @property {import("../subsets/subsetPartitionCache").SubsetPartitionCache} [subsetPartitionCache]
 * Session-scoped subset cache, created on first subset profiling run.
 */

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
export function buildProfilingSource(rows = [], columnMeta = []) {
  const columnsBySourceField = new Map();

  for (const column of columnMeta) {
    const sourceField = getSourceField(column, rows);
    if (!sourceField || columnsBySourceField.has(sourceField)) continue;

    columnsBySourceField.set(
      sourceField,
      profileAndEncodeColumn(rows, sourceField)
    );
  }

  return {
    recordCount: rows.length,
    columnsBySourceField,
  };
}

/**
 * Applies cached per-attribute statistics back onto the current schema. This
 * function is intentionally cheap and may run after rename, exclude/include,
 * delete, or datatype display edits. It does not inspect raw rows.
 */
export function applyStatistics(columnMeta = [], profilingSource) {
  return columnMeta.map((column) => {
    const profiledSource = getProfiledSourceForColumn(profilingSource, column);
    const sourceField =
      profiledSource?.sourceField || column.sourceField || column.field;
    const source = profiledSource?.source;
    const directIdentifierEvidence =
      source || column.directIdentifierEvidence
        ? buildDirectIdentifierEvidenceForCurrentFieldName(
            column.field,
            source?.directIdentifierEvidence || column.directIdentifierEvidence
          )
        : null;
    // A rename that changes the detected concept or default exclusion
    // re-evaluates earlier automatic decisions, as for schema-only attributes.
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
        codes: source.encoded.codes,
      };
    })
    .filter(Boolean);
}
