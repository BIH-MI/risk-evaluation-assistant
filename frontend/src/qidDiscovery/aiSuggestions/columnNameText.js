// Turns a column name (and optional researcher-written description) into the
// premise text given to the zero-shot classifier. Only naming conventions are
// normalized here; there is deliberately no alias or abbreviation dictionary,
// because interpreting what the words mean is the model's job. Patient-level
// values are never part of the input.

const MAX_DESCRIPTION_LENGTH = 300;

/**
 * Splits snake_case, kebab-case, dotted and camelCase/PascalCase names into
 * lowercase words: "PatientDOB_2" -> "patient dob 2",
 * "emailAddress" -> "email address".
 */
export function toReadableColumnName(columnName = "") {
  return String(columnName || "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/[_\-.\s/\\]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeDescription(description = "") {
  return String(description || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);
}

/**
 * Normalized classification input. `text` is sent to the model; `cacheKey`
 * identifies the input for session caching (equal inputs give equal results).
 * `columnName` keeps the exact current name so a rename that normalizes to the
 * same text (e.g. "FirstName" -> "first_name") still invalidates suggestions.
 */
export function buildColumnClassificationInput({ columnName, description }) {
  const readableName = toReadableColumnName(columnName);
  const normalizedDescription = normalizeDescription(description);
  const text = normalizedDescription
    ? `Column name: ${readableName}. Description: ${normalizedDescription}.`
    : `Column name: ${readableName}.`;

  return {
    columnName: String(columnName || ""),
    readableName,
    description: normalizedDescription,
    text,
    cacheKey: text,
  };
}
