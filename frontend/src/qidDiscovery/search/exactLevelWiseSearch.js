import { canExpandResult, compareSearchResults } from "./ranking";
import { buildCandidateMap } from "./combinationCache";

function expandIndices(indices, candidateCount, maxCombinationSize) {
  if (indices.length >= maxCombinationSize) return [];

  const expansions = [];
  const lastIndex = indices[indices.length - 1];

  for (
    let nextIndex = lastIndex + 1;
    nextIndex < candidateCount;
    nextIndex += 1
  ) {
    expansions.push([...indices, nextIndex]);
  }

  return expansions;
}

function rememberEvaluation(evaluatedResults, result) {
  evaluatedResults.set(result.key, result);
  return result;
}

function evaluate(
  indices,
  candidateColumns,
  candidateMap,
  options,
  combinationCache,
  evaluatedResults
) {
  return rememberEvaluation(
    evaluatedResults,
    combinationCache.getByCandidateIndices(
      indices,
      candidateColumns,
      options,
      candidateMap
    )
  );
}

/**
 * Systematically explores all expandable combinations by increasing
 * combination size. Ranking sorts exact-search candidates for deterministic
 * processing, but it does not discard low-ranked candidates; every expandable
 * candidate continues to the next level.
 */
export function runExactLevelWiseSearch(
  candidateColumns,
  options,
  combinationCache
) {
  const evaluatedResults = new Map();
  const candidateMap = buildCandidateMap(candidateColumns);
  const maxCombinationSize = Math.min(
    options.maxCombinationSize,
    candidateColumns.length
  );

  let currentLevel = candidateColumns.map((_column, index) => ({
    indices: [index],
    result: evaluate(
      [index],
      candidateColumns,
      candidateMap,
      options,
      combinationCache,
      evaluatedResults
    ),
  }));

  for (let size = 2; size <= maxCombinationSize; size += 1) {
    const seen = new Set();
    const nextLevelIndices = [];

    currentLevel
      .filter(({ result }) => canExpandResult(result, options))
      .forEach(({ indices }) => {
        expandIndices(
          indices,
          candidateColumns.length,
          maxCombinationSize
        ).forEach((indices) => {
          const key = JSON.stringify(indices);
          if (!seen.has(key)) {
            seen.add(key);
            nextLevelIndices.push(indices);
          }
        });
      });

    if (!nextLevelIndices.length) break;
    currentLevel = nextLevelIndices
      .map((indices) => ({
        indices,
        result: evaluate(
          indices,
          candidateColumns,
          candidateMap,
          options,
          combinationCache,
          evaluatedResults
        ),
      }))
      .sort((left, right) => compareSearchResults(left.result, right.result));
  }

  return {
    mode: "exact_level_wise",
    evaluatedResults: Array.from(evaluatedResults.values()),
  };
}
