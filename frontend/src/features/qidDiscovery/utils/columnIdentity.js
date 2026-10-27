/** Stable CSV source identity survives researcher renames. */
export const getColumnIdentity = (column = {}) =>
  column.sourceField || column.field;

export function isUploadedTableReady(table) {
  return (
    Boolean(table) &&
    !table.isParsing &&
    !table.isManual &&
    Boolean(table._qidProfilingSession) &&
    Array.isArray(table.columnMeta)
  );
}
