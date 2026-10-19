import {
  DIRECT_IDENTIFIER_CONFIDENCE,
  VALUE_PATTERN_MATCHERS,
  VALUE_PATTERN_SOURCE_NAMES,
  VALUE_PATTERN_THRESHOLDS,
} from "./directIdentifierRules";

// Answers "what Direct Identifier evidence was observed?" for a column's
// values. Deciding what REA does with that evidence (default exclusion,
// overrides, submission validation) belongs to directIdentifierPolicy.js.
//
// Evidence comes only from aggregate value-pattern counts. Column names are
// not interpreted here: optional AI suggestions about names live in
// qidDiscovery/aiSuggestions/ and stay separate from this evidence, so they
// never produce HIGH-confidence evidence, block submission, or get persisted
// as confirmed identifier evidence. (AI-based automatic exclusions are a
// separate `aiAutoExcluded` decision in the Add Dataset form.)

/**
 * @typedef {Object} DirectIdentifierEvidence
 * @property {boolean} detected True for supported Direct Identifier evidence.
 * @property {"HIGH"|"LOW"} confidence HIGH for detected evidence, LOW otherwise.
 * @property {string|null} concept Matched Direct Identifier concept.
 * @property {string[]} sources Value-pattern evidence sources.
 * @property {boolean} requiresReview True for LOW-confidence potential identifiers.
 * @property {boolean} [schemaOnly] Set when no values were scanned (manual
 * attributes, Edit Dataset attributes without a CSV).
 * @property {Object<string, ValuePatternEvidence>} valuePatternEvidence
 * Aggregate value-pattern counts by concept (never raw values).
 */

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

// Counts cached from the original CSV scan, re-read on every schema refresh.
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

  Object.entries(normalizedValuePatternEvidence).forEach(
    ([concept, evidence]) => {
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
    }
  );

  return {
    supportedPatterns: sortValuePatternClassifications(supportedPatterns),
    reviewPatterns,
  };
}

function valuePatternSource(concept) {
  return `value-pattern:${VALUE_PATTERN_SOURCE_NAMES[concept] || concept}`;
}

// Turns classified value patterns into one evidence object. A supported
// pattern is enough to `detect` at HIGH confidence; review-level patterns
// only set `requiresReview`.
function buildEvidence({ valuePatternEvidence, supportedPatterns, reviewPatterns }) {
  const concept = supportedPatterns.length ? supportedPatterns[0].concept : null;
  const detected = Boolean(concept);
  const sources = detected
    ? [valuePatternSource(concept)]
    : reviewPatterns.map((pattern) => valuePatternSource(pattern.concept));

  return {
    detected,
    confidence: detected
      ? DIRECT_IDENTIFIER_CONFIDENCE.HIGH
      : DIRECT_IDENTIFIER_CONFIDENCE.LOW,
    concept,
    sources: Array.from(new Set(sources)),
    requiresReview: !detected && reviewPatterns.length > 0,
    valuePatternEvidence,
  };
}

/**
 * Creates a per-column accumulator that collects Direct Identifier
 * value-pattern evidence during profileAndEncodeColumn's single pass over a
 * source column. Call `observe()` once per row and `finalize()` once at the
 * end of the pass to get the value-pattern evidence.
 */
export function createDirectIdentifierEvidenceAccumulator() {
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

      return buildEvidence({
        valuePatternEvidence,
        ...classifyValuePatternEvidence(valuePatternEvidence),
      });
    },
  };
}

/**
 * Builds Direct Identifier evidence for an attribute with no observed values
 * (e.g. a manually added column, or a schema-only Edit Dataset attribute that
 * has no CSV to scan). Without values there is no evidence; this is not a
 * statement that the attribute is safe.
 */
export function buildSchemaOnlyDirectIdentifierEvidence() {
  return {
    ...createDirectIdentifierEvidenceAccumulator().finalize(),
    schemaOnly: true,
  };
}

/**
 * Re-evaluates Direct Identifier evidence from the value-pattern counts cached
 * during the original CSV scan, without rescanning rows. Renaming a column
 * does not change this evidence, because it no longer depends on the name.
 */
export function buildDirectIdentifierEvidenceFromCachedPatterns(
  cachedSourceEvidence = null
) {
  // The stored object is passed through unchanged; normalization only feeds
  // the classifier.
  const valuePatternEvidence = cachedSourceEvidence?.valuePatternEvidence || {};

  return buildEvidence({
    valuePatternEvidence,
    ...classifyValuePatternEvidence(
      normalizeStoredPatternEvidence(valuePatternEvidence)
    ),
  });
}
