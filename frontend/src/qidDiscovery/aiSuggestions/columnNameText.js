// Turns a column name (and optional researcher-written description) into the
// premise text given to the zero-shot classifier. Only naming conventions are
// normalized here; there is deliberately no alias or abbreviation dictionary,
// because interpreting what the words mean is the model's job. Patient-level
// values are never part of the input.

const MAX_DESCRIPTION_LENGTH = 300;

// Premise formats, selected per prompt profile (promptProfiles.js). A
// format id is part of the prompt fingerprint: add a new format instead of
// changing one.
// - column-name-text-v1: "Column name: patient dob."
// - data-field-text-v1: "Data field: patient dob." Avoids the word "name":
//   BERT-style MNLI models otherwise rate "a person's name" as entailed for
//   almost any column through lexical overlap.
export const AI_COLUMN_TEXT_FORMATS = Object.freeze({
  "column-name-text-v1": "Column name",
  "data-field-text-v1": "Data field",
});

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

/** Premise text of `input` in one of AI_COLUMN_TEXT_FORMATS. */
export function formatColumnPremise(input, format) {
  const prefix = AI_COLUMN_TEXT_FORMATS[format];
  if (!prefix) throw new Error(`Unknown AI column text format: ${format}`);
  return input.description
    ? `${prefix}: ${input.readableName}. Description: ${input.description}.`
    : `${prefix}: ${input.readableName}.`;
}

/**
 * Normalized classification input. `cacheKey` identifies the input for
 * session caching (equal inputs give equal results for the same model and
 * prompt profile). `columnName` keeps the exact current name so a rename that
 * normalizes to the same words ("FirstName" -> "first_name") still
 * invalidates suggestions.
 */
export function buildColumnClassificationInput({ columnName, description }) {
  const readableName = toReadableColumnName(columnName);
  const normalizedDescription = normalizeDescription(description);
  return {
    columnName: String(columnName || ""),
    readableName,
    description: normalizedDescription,
    cacheKey: `${readableName}\u0000${normalizedDescription}`,
  };
}
