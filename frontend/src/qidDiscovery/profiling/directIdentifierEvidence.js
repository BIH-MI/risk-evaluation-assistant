import {
  DIRECT_IDENTIFIER_CONCEPTS,
  DIRECT_IDENTIFIER_CONFIDENCE,
  GENERIC_IDENTIFIER_FIELD_SOURCE,
  GENERIC_IDENTIFIER_TOKENS,
  TOKEN_ABBREVIATIONS,
  VALUE_PATTERN_MATCHERS,
  VALUE_PATTERN_SOURCE_NAMES,
  VALUE_PATTERN_THRESHOLDS,
} from "./directIdentifierRules";

// Answers "what Direct Identifier evidence was observed?" for a field name and
// its values. Deciding what REA does with that evidence (default exclusion,
// overrides, submission validation) belongs to directIdentifierPolicy.js.

// Splits a field name into lowercase word tokens: camelCase boundaries and
// non-alphanumeric separators both become token breaks (e.g. "PatientID_2"
// -> ["patient", "id", "2"]).
function splitFieldNameTokens(fieldName = "") {
  const camelSplit = String(fieldName || "")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  const normalized = camelSplit
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalized) return [];

  return normalized.split(/\s+/).filter(Boolean);
}

/**
 * Normalizes a field name into comparable lookup keys. Token abbreviations
 * (e.g. "ssn" -> "social security number") are expanded so aliased spellings
 * of the same concept resolve to the same key; `rawKey`/`rawCompactKey` keep
 * the un-expanded tokens for exact-alias matches like "ssn" itself.
 */
function normalizeFieldName(fieldName = "") {
  const rawTokens = splitFieldNameTokens(fieldName);
  const tokens = rawTokens.flatMap(
    (token) => TOKEN_ABBREVIATIONS[token] || [token]
  );

  return {
    original: String(fieldName || ""),
    rawTokens,
    tokens,
    rawKey: rawTokens.join("_"),
    rawCompactKey: rawTokens.join(""),
    key: tokens.join("_"),
    compactKey: tokens.join(""),
  };
}

function uniqueKeys(keys) {
  return Array.from(new Set(keys.filter(Boolean)));
}

function normalizedKeysForAlias(alias) {
  const normalized = normalizeFieldName(alias);
  return uniqueKeys([
    normalized.key,
    normalized.compactKey,
    normalized.rawKey,
    normalized.rawCompactKey,
  ]);
}

// Builds a normalized-key -> {concept, alias} lookup once from
// DIRECT_IDENTIFIER_CONCEPTS, so matching a field name is a single Map read
// instead of re-normalizing every alias on every column.
function buildFieldNameAliasIndex() {
  const index = new Map();

  Object.entries(DIRECT_IDENTIFIER_CONCEPTS).forEach(([concept, config]) => {
    config.aliases.forEach((alias) => {
      normalizedKeysForAlias(alias).forEach((key) => {
        index.set(key, {
          concept,
          alias,
        });
      });
    });
  });

  return index;
}

const FIELD_NAME_ALIAS_INDEX = buildFieldNameAliasIndex();

/**
 * @typedef {Object} DirectIdentifierEvidence
 * @property {boolean} detected True for supported Direct Identifier evidence.
 * @property {"HIGH"|"LOW"} confidence HIGH for detected evidence, LOW otherwise.
 * @property {string|null} concept Matched Direct Identifier concept.
 * @property {string[]} sources Field-name and value-pattern evidence sources.
 * @property {boolean} requiresReview True for LOW-confidence potential identifiers.
 * @property {boolean} [schemaOnly] Set when evidence comes from a field name
 * without scanned values.
 * @property {Object<string, ValuePatternEvidence>} valuePatternEvidence
 * Aggregate value-pattern counts by concept (never raw values).
 * @property {Object} fieldName Normalized current field-name tokens and keys.
 */

function getFieldNameKeys(normalizedFieldName) {
  return uniqueKeys([
    normalizedFieldName.key,
    normalizedFieldName.compactKey,
    normalizedFieldName.rawKey,
    normalizedFieldName.rawCompactKey,
  ]);
}

// HIGH-confidence field-name evidence: the whole normalized name matches a
// known concept alias (e.g. "email_address", "ssn").
function getStrongFieldNameEvidence(fieldName) {
  const normalized = normalizeFieldName(fieldName);

  for (const key of getFieldNameKeys(normalized)) {
    const match = FIELD_NAME_ALIAS_INDEX.get(key);
    if (match) {
      return {
        concept: match.concept,
        alias: match.alias,
        normalizedKey: normalized.key || normalized.rawKey || key,
      };
    }
  }

  return null;
}

// LOW-confidence field-name evidence: the name contains a generic ID-like
// token (e.g. "id", "uuid") anywhere, not just as a suffix, so "id_number",
// "IdCode", and "uuid" are flagged alongside "patient_id". These fields are
// potential identifiers: policy may exclude them by default, but evidence stays
// LOW/review because a bare "id" token is not a confirmed Direct Identifier.
function getWeakIdentifierFieldEvidence(fieldName) {
  const normalized = normalizeFieldName(fieldName);
  const tokens = normalized.tokens.length
    ? normalized.tokens
    : normalized.rawTokens;
  if (!tokens.length) return null;

  const hasGenericIdentifierToken = tokens.some((token) =>
    GENERIC_IDENTIFIER_TOKENS.has(token)
  );
  if (!hasGenericIdentifierToken) return null;

  return {
    normalizedKey: normalized.key || normalized.rawKey,
    source: GENERIC_IDENTIFIER_FIELD_SOURCE,
  };
}

/**
 * Aggregate value-pattern counts for one concept. Both freshly observed and
 * stored evidence are normalized to this shape before classification.
 *
 * @typedef {Object} ValuePatternEvidence
 * @property {number} matchedValueCount
 * @property {number} analysedNonMissingCount
 * @property {number} matchedFraction
 */

// Counts from a single column pass. Concepts that never matched are omitted.
function normalizeObservedPatternEvidence(
  patternCounts = {},
  analysedNonMissingCount = 0
) {
  const valuePatternEvidence = {};

  Object.entries(patternCounts).forEach(([concept, matchedValueCount]) => {
    if (!matchedValueCount) return;

    const matchedFraction = analysedNonMissingCount
      ? matchedValueCount / analysedNonMissingCount
      : 0;
    const patternEvidence = {
      matchedValueCount,
      analysedNonMissingCount,
      matchedFraction,
    };

    valuePatternEvidence[concept] = patternEvidence;
  });

  return valuePatternEvidence;
}

// Counts cached from the original CSV scan, re-read after a rename.
function normalizeStoredPatternEvidence(valuePatternEvidence = {}) {
  return Object.entries(valuePatternEvidence || {}).reduce(
    (normalized, [concept, storedEvidence]) => {
      const matchedValueCount = storedEvidence?.matchedValueCount || 0;
      const analysedNonMissingCount =
        storedEvidence?.analysedNonMissingCount || 0;
      const matchedFraction =
        storedEvidence?.matchedFraction ??
        (analysedNonMissingCount
          ? matchedValueCount / analysedNonMissingCount
          : 0);

      normalized[concept] = {
        ...storedEvidence,
        matchedValueCount,
        analysedNonMissingCount,
        matchedFraction,
      };

      return normalized;
    },
    {}
  );
}

function sortValuePatternClassifications(patterns) {
  patterns.sort(
    (left, right) =>
      right.evidence.matchedFraction - left.evidence.matchedFraction ||
      right.evidence.matchedValueCount - left.evidence.matchedValueCount
  );

  return patterns;
}

// The single implementation of the value-pattern threshold rules. Classifies
// normalized evidence into "supported" (detection evidence, strongest first)
// and "review" (flagged but not detected).
function classifyValuePatternEvidence(normalizedValuePatternEvidence) {
  const supportedPatterns = [];
  const reviewPatterns = [];

  Object.entries(normalizedValuePatternEvidence).forEach(([concept, evidence]) => {
    const threshold = VALUE_PATTERN_THRESHOLDS[concept] || {};
    const hasMinimumSupport =
      evidence.analysedNonMissingCount >=
        threshold.minAnalysedNonMissingCount &&
      evidence.matchedValueCount >= threshold.minMatchedValueCount;

    if (
      hasMinimumSupport &&
      evidence.matchedFraction >= threshold.minMatchedFraction
    ) {
      supportedPatterns.push({
        concept,
        evidence,
      });
      return;
    }

    if (
      hasMinimumSupport &&
      evidence.matchedFraction >= threshold.reviewFraction
    ) {
      reviewPatterns.push({
        concept,
        evidence,
      });
    }
  });

  return {
    supportedPatterns: sortValuePatternClassifications(supportedPatterns),
    reviewPatterns,
  };
}

function valuePatternSource(concept) {
  return `value-pattern:${VALUE_PATTERN_SOURCE_NAMES[concept] || concept}`;
}

// Combines field-name and value-pattern signals into one evidence object.
// A strong field-name alias wins over a supported value pattern when both are
// present; either alone is enough to `detect` at HIGH confidence. Weak
// field-name/value-pattern signals only set `requiresReview`.
function buildEvidence({
  fieldName,
  strongFieldNameEvidence,
  weakFieldEvidence,
  valuePatternEvidence,
  supportedPatterns,
  reviewPatterns,
}) {
  const sources = [];
  let concept = strongFieldNameEvidence?.concept || null;

  if (strongFieldNameEvidence) {
    sources.push(`field-name:${strongFieldNameEvidence.normalizedKey}`);
  }

  if (!concept && supportedPatterns.length) {
    concept = supportedPatterns[0].concept;
  }

  supportedPatterns.forEach((pattern) => {
    if (pattern.concept === concept) {
      sources.push(valuePatternSource(pattern.concept));
    }
  });

  const detected = Boolean(concept);
  const requiresReview =
    !detected && Boolean(weakFieldEvidence || reviewPatterns.length);

  if (!detected && weakFieldEvidence) {
    sources.push(weakFieldEvidence.source);
  }

  if (!detected) {
    reviewPatterns.forEach((pattern) => {
      sources.push(valuePatternSource(pattern.concept));
    });
  }

  return {
    detected,
    confidence: detected
      ? DIRECT_IDENTIFIER_CONFIDENCE.HIGH
      : DIRECT_IDENTIFIER_CONFIDENCE.LOW,
    concept,
    sources: Array.from(new Set(sources)),
    requiresReview,
    valuePatternEvidence,
    fieldName: normalizeFieldName(fieldName),
  };
}

/**
 * Creates a per-column accumulator that collects Direct Identifier
 * value-pattern evidence during profileAndEncodeColumn's single pass over a
 * source column. Call `observe()` once per row and `finalize()` once at the
 * end of the pass to get the combined field-name + value-pattern evidence.
 */
export function createDirectIdentifierEvidenceAccumulator(sourceField) {
  const strongFieldNameEvidence = getStrongFieldNameEvidence(sourceField);
  const weakFieldEvidence = getWeakIdentifierFieldEvidence(sourceField);
  const patternCounts = Object.keys(VALUE_PATTERN_MATCHERS).reduce(
    (counts, concept) => ({
      ...counts,
      [concept]: 0,
    }),
    {}
  );
  let analysedNonMissingCount = 0;

  return {
    observe(rawValue, isNonMissing) {
      if (!isNonMissing) return;

      analysedNonMissingCount += 1;
      Object.entries(VALUE_PATTERN_MATCHERS).forEach(([concept, matcher]) => {
        if (matcher(rawValue)) {
          patternCounts[concept] += 1;
        }
      });
    },

    finalize() {
      const valuePatternEvidence = normalizeObservedPatternEvidence(
        patternCounts,
        analysedNonMissingCount
      );
      const { supportedPatterns, reviewPatterns } =
        classifyValuePatternEvidence(valuePatternEvidence);

      return buildEvidence({
        fieldName: sourceField,
        strongFieldNameEvidence,
        weakFieldEvidence,
        valuePatternEvidence,
        supportedPatterns,
        reviewPatterns,
      });
    },
  };
}

/**
 * Builds Direct Identifier evidence from a field name alone, with no
 * observed values (e.g. a manually added column, or a schema-only Edit
 * Dataset attribute that has no CSV to scan).
 */
export function buildDirectIdentifierEvidenceFromFieldName(fieldName) {
  return createDirectIdentifierEvidenceAccumulator(fieldName).finalize();
}

/**
 * Re-evaluates Direct Identifier evidence for a column's *current* field
 * name after a rename, reusing the value-pattern counts cached from the
 * original CSV scan instead of rescanning rows. This is why renaming
 * "var_1" to "email_address" gains EMAIL evidence immediately.
 */
export function buildDirectIdentifierEvidenceForCurrentFieldName(
  fieldName,
  cachedSourceEvidence = null
) {
  // The stored object is passed through unchanged; normalization only feeds
  // the classifier.
  const valuePatternEvidence = cachedSourceEvidence?.valuePatternEvidence || {};
  const { supportedPatterns, reviewPatterns } = classifyValuePatternEvidence(
    normalizeStoredPatternEvidence(valuePatternEvidence)
  );

  return buildEvidence({
    fieldName,
    strongFieldNameEvidence: getStrongFieldNameEvidence(fieldName),
    weakFieldEvidence: getWeakIdentifierFieldEvidence(fieldName),
    valuePatternEvidence,
    supportedPatterns,
    reviewPatterns,
  });
}
