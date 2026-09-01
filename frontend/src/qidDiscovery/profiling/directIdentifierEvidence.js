import {
  DEFAULT_VALUE_PATTERN_THRESHOLDS,
  DIRECT_IDENTIFIER_CONCEPTS,
  DIRECT_IDENTIFIER_CONFIDENCE,
  GENERIC_IDENTIFIER_TOKENS,
  TOKEN_ABBREVIATIONS,
  VALUE_PATTERN_MATCHERS,
  VALUE_PATTERN_SOURCE_NAMES,
} from "./directIdentifierRules";

const GENERIC_IDENTIFIER_FIELD_SOURCE = "field-name:generic_identifier";

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
export function normalizeFieldName(fieldName = "") {
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

function getValuePatternThreshold(concept, options = {}) {
  return {
    ...DEFAULT_VALUE_PATTERN_THRESHOLDS[concept],
    ...(options.valuePatternThresholds?.[concept] || {}),
  };
}

// Classifies freshly counted value-pattern matches (from one CSV scan) into
// "supported" (meets minMatchedFraction -> counts as detection evidence) and
// "review" (meets the lower reviewFraction only -> flagged but not detected).
function summarizeValuePatternEvidence(
  patternCounts,
  analysedNonMissingCount,
  options = {}
) {
  const valuePatternEvidence = {};
  const supportedPatterns = [];
  const reviewPatterns = [];

  Object.entries(patternCounts).forEach(([concept, matchedValueCount]) => {
    if (!matchedValueCount) return;

    const matchedFraction = analysedNonMissingCount
      ? matchedValueCount / analysedNonMissingCount
      : 0;
    const threshold = getValuePatternThreshold(concept, options);
    const patternEvidence = {
      matchedValueCount,
      analysedNonMissingCount,
      matchedFraction,
    };

    valuePatternEvidence[concept] = patternEvidence;

    const hasMinimumSupport =
      analysedNonMissingCount >= threshold.minAnalysedNonMissingCount &&
      matchedValueCount >= threshold.minMatchedValueCount;

    if (hasMinimumSupport && matchedFraction >= threshold.minMatchedFraction) {
      supportedPatterns.push({
        concept,
        evidence: patternEvidence,
      });
      return;
    }

    if (hasMinimumSupport && matchedFraction >= threshold.reviewFraction) {
      reviewPatterns.push({
        concept,
        evidence: patternEvidence,
      });
    }
  });

  supportedPatterns.sort(
    (a, b) =>
      b.evidence.matchedFraction - a.evidence.matchedFraction ||
      b.evidence.matchedValueCount - a.evidence.matchedValueCount
  );

  return {
    valuePatternEvidence,
    supportedPatterns,
    reviewPatterns,
  };
}

// Same classification as summarizeValuePatternEvidence, but replayed against
// value-pattern counts cached from the original CSV scan (see
// buildDirectIdentifierEvidenceForCurrentFieldName) instead of re-observing
// values, so a rename can be re-evaluated without rescanning rows.
function summarizeStoredValuePatternEvidence(
  valuePatternEvidence = {},
  options = {}
) {
  const supportedPatterns = [];
  const reviewPatterns = [];

  Object.entries(valuePatternEvidence || {}).forEach(
    ([concept, storedEvidence]) => {
      const matchedValueCount = storedEvidence?.matchedValueCount || 0;
      const analysedNonMissingCount =
        storedEvidence?.analysedNonMissingCount || 0;
      const matchedFraction =
        storedEvidence?.matchedFraction ??
        (analysedNonMissingCount
          ? matchedValueCount / analysedNonMissingCount
          : 0);
      const evidence = {
        ...storedEvidence,
        matchedValueCount,
        analysedNonMissingCount,
        matchedFraction,
      };
      const threshold = getValuePatternThreshold(concept, options);
      const hasMinimumSupport =
        analysedNonMissingCount >= threshold.minAnalysedNonMissingCount &&
        matchedValueCount >= threshold.minMatchedValueCount;

      if (
        hasMinimumSupport &&
        matchedFraction >= threshold.minMatchedFraction
      ) {
        supportedPatterns.push({
          concept,
          evidence,
        });
        return;
      }

      if (hasMinimumSupport && matchedFraction >= threshold.reviewFraction) {
        reviewPatterns.push({
          concept,
          evidence,
        });
      }
    }
  );

  supportedPatterns.sort(
    (a, b) =>
      b.evidence.matchedFraction - a.evidence.matchedFraction ||
      b.evidence.matchedValueCount - a.evidence.matchedValueCount
  );

  return {
    valuePatternEvidence,
    supportedPatterns,
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
export function createDirectIdentifierEvidenceAccumulator(
  sourceField,
  options = {}
) {
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
      const { valuePatternEvidence, supportedPatterns, reviewPatterns } =
        summarizeValuePatternEvidence(
          patternCounts,
          analysedNonMissingCount,
          options
        );

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
export function buildDirectIdentifierEvidenceFromFieldName(
  fieldName,
  options = {}
) {
  return createDirectIdentifierEvidenceAccumulator(
    fieldName,
    options
  ).finalize();
}

/**
 * Re-evaluates Direct Identifier evidence for a column's *current* field
 * name after a rename, reusing the value-pattern counts cached from the
 * original CSV scan instead of rescanning rows. This is why renaming
 * "var_1" to "email_address" gains EMAIL evidence immediately.
 */
export function buildDirectIdentifierEvidenceForCurrentFieldName(
  fieldName,
  cachedSourceEvidence = null,
  options = {}
) {
  const { valuePatternEvidence, supportedPatterns, reviewPatterns } =
    summarizeStoredValuePatternEvidence(
      cachedSourceEvidence?.valuePatternEvidence || {},
      options
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

/**
 * True only for HIGH-confidence evidence (a strong field-name alias or a
 * supported value pattern). LOW-confidence/`requiresReview` evidence -
 * including every ID-like field name matched by GENERIC_IDENTIFIER_TOKENS -
 * is kept semantically separate from confirmed Direct Identifiers.
 */
export function shouldAutoExcludeDirectIdentifier(evidence) {
  return (
    evidence?.detected === true &&
    evidence.confidence === DIRECT_IDENTIFIER_CONFIDENCE.HIGH
  );
}

/**
 * Detects generic ID-like field-name evidence without changing its LOW
 * confidence classification. The policy layer uses this to default-exclude
 * record/subject/patient/study IDs from QID search while still surfacing them
 * as ambiguous potential identifiers.
 */
export function hasGenericIdentifierFieldEvidence(evidence) {
  return Boolean(evidence?.sources?.includes(GENERIC_IDENTIFIER_FIELD_SOURCE));
}

/**
 * Returns true when an identifier should be excluded from QID candidates by
 * default. Confirmed Direct Identifiers qualify through HIGH evidence; generic
 * IDs qualify only through their LOW generic field-name source.
 */
export function shouldExcludeIdentifierByDefault(evidence) {
  return (
    shouldAutoExcludeDirectIdentifier(evidence) ||
    hasGenericIdentifierFieldEvidence(evidence)
  );
}
