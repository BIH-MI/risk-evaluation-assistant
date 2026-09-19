import {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
  updateSubjectKeySourceField,
} from "./profiling/profilingSource";
import { runBeamSearch } from "./search/beamSearch";
import { CombinationCache } from "./search/combinationCache";
import { resolveQidSearchMode } from "./configuration/resolveQidSearchMode";
import { validateQidDiscoverySearchConfiguration } from "./configuration/validateQidDiscoverySearchConfiguration";
import { runExactLevelWiseSearch } from "./search/exactLevelWiseSearch";
import { compareSearchResults, isTargetSatisfied } from "./search/ranking";

export const CSV_PREVIEW_ROW_LIMIT = 10000;

function getCombinationCache(profilingSource) {
  if (!profilingSource.combinationCache) {
    profilingSource.combinationCache = new CombinationCache(profilingSource);
  }

  return profilingSource.combinationCache;
}

function hasSubset(candidate, possibleSubset) {
  if (possibleSubset.attributeCount >= candidate.attributeCount) return false;
  const candidateStableIds = new Set(candidate.stableAttributeIds);
  return possibleSubset.stableAttributeIds.every((stableAttributeId) =>
    candidateStableIds.has(stableAttributeId)
  );
}

/**
 * Selects aggregate combination results to persist with the dataset. Only
 * selected metrics and current display names leave the transient profiling
 * session; partitions, rowGroupIds, encoded columns, and cache entries stay
 * browser-local.
 */
export function selectPersistedCombinations(evaluatedResults, options) {
  const multiAttributeResults = evaluatedResults.filter(
    (result) => result.attributeCount >= 2
  );
  const qualifying = multiAttributeResults.filter((result) =>
    isTargetSatisfied(result, options)
  );
  const minimalQualifying = qualifying.filter(
    (result) =>
      !qualifying.some((possibleSubset) => hasSubset(result, possibleSubset))
  );
  const qualifyingKeys = new Set(qualifying.map((result) => result.key));
  const minimalQualifyingKeys = new Set(
    minimalQualifying.map((result) => result.key)
  );
  const selected = new Map();

  [
    ...minimalQualifying.sort(compareSearchResults),
    ...multiAttributeResults.sort(compareSearchResults),
  ].forEach((result) => {
    if (selected.size >= options.maxPersistedCombinations) return;
    selected.set(result.key, result);
  });

  return Array.from(selected.values()).map((result) => ({
    attributeNames: result.attributeNames,
    attributeCount: result.attributeCount,
    distinction: result.distinction,
    separation: result.separation,
    equivalenceClassCount: result.equivalenceClassCount,
    singletonClassCount: result.singletonClassCount,
    singletonRecordCount: result.singletonRecordCount,
    singletonFraction: result.singletonFraction,
    minimumEquivalenceClassSize: result.minimumEquivalenceClassSize,
    medianEquivalenceClassSize: result.medianEquivalenceClassSize,
    maximumEquivalenceClassSize: result.maximumEquivalenceClassSize,
    targetSatisfied: qualifyingKeys.has(result.key),
    minimalQualifying: minimalQualifyingKeys.has(result.key),
  }));
}

/**
 * Runs QID discovery over already-prepared candidates. Identifier/exclusion
 * policy is intentionally not repeated here; exact-vs-beam selection is
 * delegated to resolveQidSearchMode().
 */
export function discoverQidCombinations(
  candidateColumns,
  profilingSource,
  searchConfiguration
) {
  const validatedConfiguration =
    validateQidDiscoverySearchConfiguration(searchConfiguration);

  if (
    candidateColumns.length < 2 ||
    !candidateColumns[0]?.codes ||
    candidateColumns[0].codes.length === 0
  ) {
    return {
      mode: "none",
      qidCombinations: [],
      evaluatedResults: [],
    };
  }

  const combinationCache = getCombinationCache(profilingSource);
  const mode = resolveQidSearchMode(
    candidateColumns.length,
    validatedConfiguration
  );
  const search =
    mode === "exact"
      ? runExactLevelWiseSearch(
          candidateColumns,
          validatedConfiguration,
          combinationCache
        )
      : runBeamSearch(
          candidateColumns,
          validatedConfiguration,
          combinationCache
        );

  return {
    mode: search.mode,
    qidCombinations: selectPersistedCombinations(
      search.evaluatedResults,
      validatedConfiguration
    ),
    evaluatedResults: search.evaluatedResults,
    trace: search.trace,
  };
}

/**
 * Reruns cheap profiling refresh from an existing profiling source. Statistics,
 * Direct Identifier evidence, Replicability evidence, and candidate columns are
 * projected onto the current schema before QID search is rerun.
 */
export function profileTableFromSource(
  profilingSource,
  columnMeta = [],
  options = {}
) {
  if (!profilingSource) {
    return {
      columnMeta,
      qidCombinations: [],
      qidSearchMode: "none",
      subjectKeySourceField: null,
      subjectKeyAutoDetected: false,
      suggestedSubjectKeySourceFields: [],
      repeatedMeasurementSummary: null,
    };
  }

  if (Object.prototype.hasOwnProperty.call(options, "subjectKeySourceField")) {
    updateSubjectKeySourceField(
      profilingSource,
      options.subjectKeySourceField,
      options
    );
  } else {
    updateSubjectKeySourceField(
      profilingSource,
      profilingSource.subjectKeySourceField,
      {
        ...options,
        preserveSubjectKeyAutoDetected: true,
      }
    );
  }

  const profiledColumnMeta = applyStatistics(
    columnMeta,
    profilingSource,
    options
  );
  const candidateColumns = buildCandidateColumns(
    profiledColumnMeta,
    profilingSource
  );
  const { mode, qidCombinations } = discoverQidCombinations(
    candidateColumns,
    profilingSource,
    options.qidDiscoverySearchConfiguration || options.searchConfiguration
  );

  return {
    columnMeta: profiledColumnMeta,
    qidCombinations,
    qidSearchMode: mode,
    subjectKeySourceField: profilingSource.subjectKeySourceField,
    subjectKeyAutoDetected: Boolean(profilingSource.subjectKeyAutoDetected),
    suggestedSubjectKeySourceFields:
      profilingSource.suggestedSubjectKeySourceFields || [],
    repeatedMeasurementSummary: profilingSource.repeatedMeasurementSummary,
  };
}

/**
 * Builds a reusable profiling source from parsed rows, then immediately runs
 * QID combination search. The returned profilingSource is transient
 * browser-local state containing encoded columns and caches for later refreshes.
 */
export function profileTableRows(rows = [], columnMeta = [], options = {}) {
  const profilingSource = buildProfilingSource(rows, columnMeta, options);

  return {
    ...profileTableFromSource(profilingSource, columnMeta, options),
    profilingSource,
  };
}

export {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
  updateSubjectKeySourceField,
};
