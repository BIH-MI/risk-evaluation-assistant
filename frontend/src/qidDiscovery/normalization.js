export const MISSING_VALUE = Symbol("REA_MISSING_VALUE");

/**
 * Defines the missing-value policy shared by attribute profiling and QID
 * combination search. Missing values are treated as one equivalence-class
 * value, which affects Distinction, Separation, and singleton counts.
 */
export function isMissingValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number" && Number.isNaN(value)) return true;
  return typeof value === "string" && value.trim() === "";
}

/**
 * Normalizes absent/empty values to one internal sentinel while leaving
 * observed values unchanged. The sentinel is transient browser-local state and
 * is never persisted.
 */
export function normalizeCellValue(value) {
  return isMissingValue(value) ? MISSING_VALUE : value;
}
