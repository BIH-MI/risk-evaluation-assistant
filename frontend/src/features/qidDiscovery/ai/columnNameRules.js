import { toReadableColumnName } from "./columnNameText";

/*
 * Conservative, model-independent column-name evidence. Runs on the
 * normalized column name only (never on values) and is kept separate from
 * the zero-shot model output, so every screening result can say which source
 * produced it. How the two are combined is decided in columnSuggestions.js.
 *
 * Matching is by whole name, not by substring: after removing leading
 * qualifiers that refer to the person ("patient", "home", "contact", ...)
 * and trailing numbers ("address line 1", "phone 2"), the remaining words
 * must equal one of the phrases below. "email_consent", "phone_contact_count"
 * or "ip_dose_mg" therefore never match a strong phrase.
 *
 * Kinds of evidence:
 * - STRONG_IDENTIFIER: an unambiguous direct-identifier name ("email",
 *   "insurance number", "social security number"). May exclude the column
 *   automatically, independent of the model, unless a model evaluated for
 *   its exact configuration confidently disagrees (then the researcher
 *   decides).
 * - WEAK_IDENTIFIER: a name that often, but not always, holds a direct
 *   identifier ("name", "address", "patient id", "record number", or a
 *   generic "contact" field). Never excludes automatically, and never lets
 *   the column pass as "no exclusion suggested": the researcher reviews it.
 * - IDENTIFIER_CONTEXT: an identifier word inside a longer name
 *   ("email_consent", "insurance_type", "sample_id"). The column is probably
 *   *about* an identifier, not the identifier itself, so a model's
 *   identifier prediction is shown for review instead of excluding.
 * - QUASI_IDENTIFIER: a common quasi-identifier ("zip code", "date of
 *   birth", "age", "sex"), or a name containing a geographic-area word
 *   ("postal area", "residence district") or a date word ("diagnosis
 *   date"). These are profiled for Distinguishability, not excluded as
 *   direct identifiers, so a model's identifier prediction is shown for
 *   review instead of excluding. `qidType` says which kind (DEMOGRAPHIC,
 *   GEOGRAPHIC, TEMPORAL).
 *
 * Kinds only ever move a decision towards review: a quasi-identifier or
 * context match turns a model-only exclusion into a review, and never makes
 * a column pass without one the model would otherwise have required.
 *
 * Changing the phrases changes screening results, so bump
 * AI_NAME_RULES_VERSION (recorded with every dataset's screening provenance).
 */

export const AI_NAME_RULES_VERSION = "column-name-rules-v2";

export const AI_NAME_EVIDENCE_KINDS = Object.freeze({
  STRONG_IDENTIFIER: "STRONG_IDENTIFIER",
  WEAK_IDENTIFIER: "WEAK_IDENTIFIER",
  IDENTIFIER_CONTEXT: "IDENTIFIER_CONTEXT",
  QUASI_IDENTIFIER: "QUASI_IDENTIFIER",
});

// Leading words that only say whose value it is.
const PERSON_QUALIFIERS = new Set([
  "patient",
  "patients",
  "person",
  "persons",
  "subject",
  "participant",
  "client",
  "member",
  "contact",
  "primary",
  "secondary",
  "home",
  "work",
  "private",
  "personal",
  "current",
]);

// Phrases per direct-identifier concept (concept ids as in
// semanticCategories.js / value-pattern evidence).
const STRONG_PHRASES = {
  PERSON_NAME: [
    "first name",
    "given name",
    "forename",
    "fname",
    "last name",
    "family name",
    "surname",
    "lname",
    "full name",
    "fullname",
    "middle name",
    "maiden name",
    "birth name",
    "mother name",
    "mothers name",
    "father name",
    "fathers name",
    "patient name",
    "person name",
    "vorname",
    "nachname",
  ],
  EMAIL: [
    "email",
    "e mail",
    "email address",
    "e mail address",
    "email addr",
    "e mail adresse",
    "email adresse",
  ],
  PHONE: [
    "phone",
    "phone number",
    "phone no",
    "telephone",
    "telephone number",
    "telephone no",
    "tel",
    "tel no",
    "mobile number",
    "mobile phone",
    "mobile no",
    "cell phone",
    "cellphone",
    "fax",
    "fax number",
    "telefon",
    "telefonnummer",
    "handynummer",
  ],
  NATIONAL_IDENTIFIER: [
    "ssn",
    "social security number",
    "social security no",
    "social sec no",
    "national id",
    "national identifier",
    "national id number",
    "national insurance number",
    "passport number",
    "passport no",
    "drivers license number",
    "driver license number",
    "driving licence number",
    "tax id",
    "steuer id",
  ],
  MEDICAL_RECORD_NUMBER: [
    "mrn",
    "mrn number",
    "medical record number",
    "medical record no",
    "medical record id",
  ],
  HEALTH_INSURANCE_IDENTIFIER: [
    "insurance number",
    "insurance no",
    "insurance id",
    "insurance member no",
    "insurance member number",
    "insurance member id",
    "health insurance number",
    "health insurance no",
    "health insurance id",
    "insurance policy number",
    "insurance policy no",
    "insurance policy id",
    "policy number",
    "policy no",
    "versichertennummer",
    "krankenversichertennummer",
    "kvnr",
  ],
  POSTAL_ADDRESS: [
    "street",
    "street address",
    "street name",
    "home address",
    "postal address",
    "residential address",
    "address line",
    "strasse",
    "anschrift",
  ],
  IP_ADDRESS: ["ip address", "ip addr", "ipv4", "ipv6", "ip v4", "ip v6"],
};

// Often, but not always, a direct identifier (pseudonymous study keys,
// generic "name"/"address" columns): always reviewed, never auto-excluded.
const WEAK_PHRASES = {
  PERSON_NAME: ["name"],
  POSTAL_ADDRESS: ["address", "addr", "mail address", "adresse"],
  PHONE: ["mobile", "cell"],
  // Clinical data often uses "IP" for "inpatient".
  IP_ADDRESS: ["ip"],
  // No direct-identifier concept: record keys that may link to a person
  // (often pseudonymous study keys).
  null: [
    "id",
    "identifier",
    "number",
    "no",
    "record number",
    "record id",
    "case id",
    "case number",
    "account number",
    "account id",
  ],
};

// Common quasi-identifiers: profiled, not excluded as direct identifiers.
const QUASI_IDENTIFIER_PHRASES = {
  GEOGRAPHIC: [
    "zip",
    "zip code",
    "zipcode",
    "postcode",
    "postal code",
    "plz",
    "city",
    "country",
    "region",
  ],
  TEMPORAL: [
    "birth date",
    "date of birth",
    "dob",
    "year of birth",
    "birth year",
  ],
  DEMOGRAPHIC: ["age", "age at diagnosis", "sex", "gender"],
};

// Words that make a name a quasi-identifier wherever they occur, unless a
// stronger rule matched first ("postal address" is a direct identifier).
// Geographic areas coarser than a street address, and calendar dates.
const QUASI_IDENTIFIER_WORDS = {
  GEOGRAPHIC: [
    "postal",
    "postcode",
    "zip",
    "plz",
    "region",
    "district",
    "county",
    "municipality",
    "province",
    "city",
    "country",
    "residence",
  ],
  TEMPORAL: ["date", "datum", "datetime", "timestamp", "dob"],
};

// "contact" followed only by these words is a generic contact field
// ("contact", "contact info", "contact_value"): it may hold an email address
// or telephone number, so it is reviewed like a weak identifier name.
const CONTACT_WORD = "contact";
const GENERIC_FIELD_WORDS = new Set([
  "value",
  "info",
  "information",
  "details",
  "data",
  "field",
  "entry",
]);

// Words that indicate an identifier concept inside a longer name.
const IDENTIFIER_WORDS = new Set([
  "name",
  "surname",
  "email",
  "mail",
  "phone",
  "telephone",
  "mobile",
  "fax",
  "ssn",
  "passport",
  "mrn",
  "insurance",
  "policy",
  "address",
  "addr",
  "street",
  "ip",
  "id",
  "contact",
]);

function buildPhraseIndex(phrasesByConcept) {
  const index = new Map();
  Object.entries(phrasesByConcept).forEach(([concept, phrases]) => {
    phrases.forEach((phrase) =>
      index.set(phrase, concept === "null" ? null : concept)
    );
  });
  return index;
}

const STRONG_INDEX = buildPhraseIndex(STRONG_PHRASES);
const WEAK_INDEX = buildPhraseIndex(WEAK_PHRASES);
const QUASI_IDENTIFIER_INDEX = buildPhraseIndex(QUASI_IDENTIFIER_PHRASES);
const QUASI_IDENTIFIER_WORD_INDEX = buildPhraseIndex(QUASI_IDENTIFIER_WORDS);

/** Name words without person qualifiers in front and numbers at the end. */
function coreWords(readableName) {
  const words = readableName.split(" ").filter(Boolean);
  let start = 0;
  // Keep at least one word: "contact" alone is matched as a phrase.
  while (start < words.length - 1 && PERSON_QUALIFIERS.has(words[start])) {
    start += 1;
  }
  let end = words.length;
  while (end > start + 1 && /^\d+$/.test(words[end - 1])) {
    end -= 1;
  }
  return words.slice(start, end);
}

/**
 * Column-name evidence for one column name, or null when the name says
 * nothing about direct identifiers.
 *
 * @returns {{ kind: string, concept: string|null, term: string,
 *   qidType?: string } | null}
 */
export function getColumnNameEvidence(columnName) {
  const readableName = toReadableColumnName(columnName);
  if (!readableName) return null;
  const kinds = AI_NAME_EVIDENCE_KINDS;
  // The full name first: qualifiers can be part of a phrase ("patient name").
  const strongPhrase = [readableName, coreWords(readableName).join(" ")].find(
    (candidate) => STRONG_INDEX.has(candidate)
  );
  if (strongPhrase) {
    return {
      kind: kinds.STRONG_IDENTIFIER,
      concept: STRONG_INDEX.get(strongPhrase),
      term: strongPhrase,
    };
  }
  const phrase = coreWords(readableName).join(" ");
  if (QUASI_IDENTIFIER_INDEX.has(phrase)) {
    return {
      kind: kinds.QUASI_IDENTIFIER,
      concept: null,
      term: phrase,
      qidType: QUASI_IDENTIFIER_INDEX.get(phrase),
    };
  }
  if (WEAK_INDEX.has(phrase)) {
    return {
      kind: kinds.WEAK_IDENTIFIER,
      concept: WEAK_INDEX.get(phrase),
      term: phrase,
    };
  }
  const words = readableName.split(" ");
  // Checked on the full name: "contact" is also a person qualifier.
  if (
    words[0] === CONTACT_WORD &&
    words.slice(1).every((word) => GENERIC_FIELD_WORDS.has(word))
  ) {
    return { kind: kinds.WEAK_IDENTIFIER, concept: null, term: CONTACT_WORD };
  }
  const identifierWord = words.find((word) => IDENTIFIER_WORDS.has(word));
  if (identifierWord) {
    return {
      kind: kinds.IDENTIFIER_CONTEXT,
      concept: null,
      term: identifierWord,
    };
  }
  const quasiIdentifierWord = words.find((word) =>
    QUASI_IDENTIFIER_WORD_INDEX.has(word)
  );
  if (quasiIdentifierWord) {
    return {
      kind: kinds.QUASI_IDENTIFIER,
      concept: null,
      term: quasiIdentifierWord,
      qidType: QUASI_IDENTIFIER_WORD_INDEX.get(quasiIdentifierWord),
    };
  }
  return null;
}
