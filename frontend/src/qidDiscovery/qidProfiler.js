import {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
} from "./profiling/profilingSource";
import { runBeamSearch } from "./search/beamSearch";
import { CombinationCache } from "./search/combinationCache";
import { runExactLevelWiseSearch } from "./search/exactLevelWiseSearch";
import {
  compareSearchResults,
  DEFAULT_QID_DISCOVERY_OPTIONS,
  isTargetSatisfied,
  mergeQidDiscoveryOptions,
} from "./search/ranking";

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
  }));
}

/**
 * Chooses Exact Level-Wise search for smaller candidate sets and Beam search
 * for larger candidate sets. The combination cache belongs to the profiling
 * source, so evaluated stable combinations are reused across search reruns.
 */
export function discoverQidCombinations(
  candidateColumns,
  profilingSource,
  options = {}
) {
  const mergedOptions = mergeQidDiscoveryOptions(options);

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
  const search =
    candidateColumns.length <= mergedOptions.exactSearchMaxCandidateCount
      ? runExactLevelWiseSearch(
          candidateColumns,
          mergedOptions,
          combinationCache
        )
      : runBeamSearch(candidateColumns, mergedOptions, combinationCache);

  return {
    mode: search.mode,
    qidCombinations: selectPersistedCombinations(
      search.evaluatedResults,
      mergedOptions
    ),
    evaluatedResults: search.evaluatedResults,
    trace: search.trace,
  };
}

/**
 * Reruns cheap candidate preparation and QID combination search from an
 * existing profiling source. This is used after schema edits and must not scan
 * original rows again.
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
    };
  }

  const profiledColumnMeta = applyStatistics(columnMeta, profilingSource);
  const candidateColumns = buildCandidateColumns(
    profiledColumnMeta,
    profilingSource
  );
  const { mode, qidCombinations } = discoverQidCombinations(
    candidateColumns,
    profilingSource,
    options
  );

  return {
    columnMeta: profiledColumnMeta,
    qidCombinations,
    qidSearchMode: mode,
  };
}

/**
 * Builds a reusable profiling source from parsed rows, then immediately runs
 * QID combination search. The returned profilingSource is transient
 * browser-local state used only to refresh search results after schema edits.
 */
export function profileTableRows(rows = [], columnMeta = [], options = {}) {
  const profilingSource = buildProfilingSource(rows, columnMeta, options);

  return {
    ...profileTableFromSource(profilingSource, columnMeta, options),
    profilingSource,
  };
}

export { DEFAULT_QID_DISCOVERY_OPTIONS };
export {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
};
