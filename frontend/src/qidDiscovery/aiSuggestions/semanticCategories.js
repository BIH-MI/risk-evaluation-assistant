/*
 * Semantic categories offered to the zero-shot classifier and the review
 * suggestion each one maps to.
 *
 * A category is a description of what a column name *appears to mean*. It is
 * never Direct Identifier evidence: only value-pattern evidence
 * (profiling/directIdentifierEvidence.js) affects submission validation and
 * persisted identifier summaries. Confident SUGGEST_EXCLUSION_REVIEW
 * suggestions may automatically exclude a column in Add Dataset (tracked as
 * `aiAutoExcluded`), which the researcher can always override.
 *
 * Review suggestions:
 *
 * | Suggestion               | Categories                               | Meaning in the UI                                   |
 * |--------------------------|------------------------------------------|-----------------------------------------------------|
 * | SUGGEST_EXCLUSION_REVIEW | PERSON_NAME, EMAIL, PHONE,               | Name looks like a potential direct identifier; the  |
 * |                          | POSTAL_ADDRESS, NATIONAL_IDENTIFIER,     | researcher may accept (exclude) or reject.          |
 * |                          | MEDICAL_RECORD_NUMBER,                   |                                                     |
 * |                          | HEALTH_INSURANCE_IDENTIFIER, IP_ADDRESS  |                                                     |
 * | NO_EXCLUSION_SUGGESTED   | DEMOGRAPHIC, CLINICAL, ADMINISTRATIVE    | No exclusion proposed. This does NOT declare the    |
 * |                          |                                          | column safe: it remains a QID candidate and is      |
 * |                          |                                          | still profiled for Distinguishability.              |
 * | MANUAL_REVIEW            | OTHER                                    | The model abstains; the researcher decides.         |
 *
 * Any classification may additionally be downgraded to "uncertain" by
 * interpretClassification.js (low score, small margin, or an identifier
 * category close behind a non-identifier one).
 */

export const AI_REVIEW_SUGGESTIONS = Object.freeze({
  SUGGEST_EXCLUSION_REVIEW: "SUGGEST_EXCLUSION_REVIEW",
  NO_EXCLUSION_SUGGESTED: "NO_EXCLUSION_SUGGESTED",
  MANUAL_REVIEW: "MANUAL_REVIEW",
});

/**
 * Labels and templates were chosen by evaluating prompt variants with this
 * model on 88 column names (41 direct identifiers, 37 QIDs/clinical, 10
 * opaque names), half of them held out from tuning. Against the previous
 * prompt this raised confident identifier detections from 23 to 28, lowered
 * false automatic exclusions from 4 to 1, and lowered identifiers predicted
 * confidently as non-identifiers from 2 to 1. Results are very sensitive to
 * wording, so any change must be re-evaluated (and bump AI_PROMPT_VERSION).
 *
 * - Short noun phrases work better than labels with examples
 *   ("such as age, sex ...") for this xsmall NLI model.
 * - "a person's insurance policy number" and "administrative process
 *   information" stop insurance-number columns from being absorbed by a
 *   generic "administrative information" label.
 * - "an unnamed or coded variable" lets opaque names (var_023) abstain
 *   instead of matching an identifier label.
 *
 * `label` is the natural-language candidate passed to the NLI model; it is
 * part of the prompt and therefore covered by AI_PROMPT_VERSION.
 * `directIdentifierConcept` links identifier-like categories to the concept
 * names already used for value-pattern evidence and i18n labels.
 */
export const AI_SEMANTIC_CATEGORIES = Object.freeze([
  {
    id: "PERSON_NAME",
    label: "a person's name or surname",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "PERSON_NAME",
  },
  {
    id: "EMAIL",
    label: "an email address",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "EMAIL",
  },
  {
    id: "PHONE",
    label: "a telephone number",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "PHONE",
  },
  {
    id: "POSTAL_ADDRESS",
    label: "a postal address",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "POSTAL_ADDRESS",
  },
  {
    id: "NATIONAL_IDENTIFIER",
    label: "a social security number",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "NATIONAL_IDENTIFIER",
  },
  {
    id: "MEDICAL_RECORD_NUMBER",
    label: "a medical record number",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "MEDICAL_RECORD_NUMBER",
  },
  {
    id: "HEALTH_INSURANCE_IDENTIFIER",
    label: "a person's insurance policy number",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "HEALTH_INSURANCE_IDENTIFIER",
  },
  {
    id: "IP_ADDRESS",
    label: "an IP address",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW,
    directIdentifierConcept: "IP_ADDRESS",
  },
  {
    id: "DEMOGRAPHIC",
    label: "demographic information",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.NO_EXCLUSION_SUGGESTED,
    directIdentifierConcept: null,
  },
  {
    id: "CLINICAL",
    label: "clinical information",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.NO_EXCLUSION_SUGGESTED,
    directIdentifierConcept: null,
  },
  {
    id: "ADMINISTRATIVE",
    label: "administrative process information",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.NO_EXCLUSION_SUGGESTED,
    directIdentifierConcept: null,
  },
  {
    id: "OTHER",
    label: "an unnamed or coded variable",
    reviewSuggestion: AI_REVIEW_SUGGESTIONS.MANUAL_REVIEW,
    directIdentifierConcept: null,
  },
]);

// Scores are averaged over these templates (prompt ensembling), which makes
// predictions less dependent on the wording of a single hypothesis.
export const AI_HYPOTHESIS_TEMPLATES = Object.freeze([
  "This column contains {}.",
  "This column records {}.",
]);

export const AI_CANDIDATE_LABELS = AI_SEMANTIC_CATEGORIES.map(
  (category) => category.label
);

const CATEGORY_BY_LABEL = new Map(
  AI_SEMANTIC_CATEGORIES.map((category) => [category.label, category])
);

export function getSemanticCategoryByLabel(label) {
  return CATEGORY_BY_LABEL.get(label) || null;
}

export function isIdentifierCategory(category) {
  return (
    category?.reviewSuggestion === AI_REVIEW_SUGGESTIONS.SUGGEST_EXCLUSION_REVIEW
  );
}
