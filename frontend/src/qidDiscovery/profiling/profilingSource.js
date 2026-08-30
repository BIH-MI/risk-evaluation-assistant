import { profileAndEncodeColumn } from "./profileAndEncodeColumn";

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

function getSourceField(column, rows) {
  if (column.sourceField) return column.sourceField;
  if (column.hasObservedData === true) return column.field;
  if (rows?.length && hasOwn(rows[0] || {}, column.field)) return column.field;
  return null;
}

/**
 * STEP 1 - Dataset profiling / candidate preparation.
 *
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
 * STEP 1 - Dataset profiling / candidate preparation.
 *
 * Builds the reusable profiling source for one uploaded table. Each observed
 * source column is normalized, profiled, and encoded once. Later schema edits
 * reuse this object and must not rescan participant-level rows.
 *
 * The optional profileColumn argument is used by tests to verify the
 * compute-once contract.
 */
export function buildProfilingSource(rows = [], columnMeta = [], options = {}) {
  const profileColumn = options.profileColumn || profileAndEncodeColumn;
  const columnsBySourceField = new Map();

  for (const column of columnMeta) {
    const sourceField = getSourceField(column, rows);
    if (!sourceField || columnsBySourceField.has(sourceField)) continue;

    columnsBySourceField.set(sourceField, profileColumn(rows, sourceField));
  }

  return {
    recordCount: rows.length,
    columnsBySourceField,
    combinationCache: null,
  };
}

/**
 * STEP 1 - Dataset profiling / candidate preparation.
 *
 * Applies cached per-attribute statistics back onto the current schema. This
 * function is intentionally cheap and may run after rename, exclude/include,
 * delete, or datatype display edits. It does not inspect raw rows.
 */
export function applyStatistics(columnMeta = [], profilingSource) {
  return columnMeta.map((column) => {
    const sourceField = column.sourceField || column.field;
    const source = profilingSource?.columnsBySourceField?.get(sourceField);

    return {
      ...column,
      sourceField: source ? sourceField : column.sourceField || null,
      hasObservedData: Boolean(source),
      level: column.level || source?.dataType || "STRING",
      statistics: source ? source.statistics : column.statistics || null,
    };
  });
}

/**
 * STEP 1 - Dataset profiling / candidate preparation.
 *
 * Selects the currently eligible attributes for Step 2. Candidate selection is
 * allowed to rerun after schema changes, but it only filters column metadata
 * and looks up already-encoded source columns from the profiling source.
 */
export function buildCandidateColumns(columnMeta = [], profilingSource) {
  return columnMeta
    .filter((column) => !column.excluded)
    .map((column) => {
      const sourceField = column.sourceField || column.field;
      const source = profilingSource?.columnsBySourceField?.get(sourceField);

      if (!source) return null;

      return {
        attributeName: column.field,
        sourceField: source.sourceField,
        stableAttributeId: source.stableAttributeId,
        codes: source.encoded.codes,
      };
    })
    .filter(Boolean);
}
