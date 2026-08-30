import { canExpandResult, compareSearchResults } from "./ranking";
import { buildCandidateMap } from "./combinationCache";

function expandBeamResult(result, candidateCount, maxCombinationSize) {
  if (result.indices.length >= maxCombinationSize) return [];

  const expansions = [];
  const lastIndex = result.indices[result.indices.length - 1];

  for (
    let nextIndex = lastIndex + 1;
    nextIndex < candidateCount;
    nextIndex += 1
  ) {
    expansions.push([...result.indices, nextIndex]);
  }

  return expansions;
}

/**
 * Beam-depth signal is Distinction + Separation. This is used only to detect
 * stagnant search depths and is distinct from the weighted ranking score.
 */
export const calculateBeamSignal = (result) =>
  result.distinction + result.separation;

/**
 * Updates consecutive Beam stagnation state. A meaningful signal improvement
 * resets stagnantDepths to zero; otherwise the count increases by one.
 */
export function updateBeamStagnation({
  bestSignal,
  levelBestSignal,
  stagnantDepths,
  minImprovement,
}) {
  if (levelBestSignal - bestSignal < minImprovement) {
    return {
      bestSignal,
      stagnantDepths: stagnantDepths + 1,
    };
  }

  return {
    bestSignal: levelBestSignal,
    stagnantDepths: 0,
  };
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
 * Bounds search complexity for many candidate attributes. At every level Beam
 * search generates children from the current beam, evaluates them through the
 * session cache, ranks them, removes non-expandable candidates, keeps only the
 * best beamWidth candidates, and expands only those at the next level.
 *
 * Beam search is approximate: it can miss a strong combination if that
 * combination's parent branch is removed from the beam.
 */
export function runBeamSearch(candidateColumns, options, combinationCache) {
  const evaluatedResults = new Map();
  const candidateMap = buildCandidateMap(candidateColumns);
  const trace = {
    levels: [],
  };
  const maxCombinationSize = Math.min(
    options.maxCombinationSize,
    candidateColumns.length
  );
  const beamWidth = Math.max(1, options.beamWidth);
  let currentBeam = candidateColumns
    .map((_column, index) => ({
      indices: [index],
      result: evaluate(
        [index],
        candidateColumns,
        candidateMap,
        options,
        combinationCache,
        evaluatedResults
      ),
    }))
    .sort((left, right) => compareSearchResults(left.result, right.result))
    .slice(0, beamWidth);
  let bestSignal = currentBeam.reduce(
    (best, { result }) => Math.max(best, calculateBeamSignal(result)),
    0
  );
  let stagnantDepths = 0;

  trace.levels.push({
    size: 1,
    retainedKeys: currentBeam.map(({ result }) => result.key),
    bestSignal,
    stagnantDepths,
  });

  for (let size = 2; size <= maxCombinationSize; size += 1) {
    const seen = new Set();
    const candidateIndices = [];

    currentBeam
      .filter(({ result }) => canExpandResult(result, options))
      .forEach(({ indices }) => {
        expandBeamResult(
          { indices },
          candidateColumns.length,
          maxCombinationSize
        ).forEach((nextIndices) => {
          const key = JSON.stringify(nextIndices);
          if (!seen.has(key)) {
            seen.add(key);
            candidateIndices.push(nextIndices);
          }
        });
      });

    if (!candidateIndices.length) break;

    const levelResults = candidateIndices
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
    const levelBestSignal = levelResults.reduce(
      (best, { result }) => Math.max(best, calculateBeamSignal(result)),
      0
    );
    const stagnation = updateBeamStagnation({
      bestSignal,
      levelBestSignal,
      stagnantDepths,
      minImprovement: options.minImprovement,
    });

    bestSignal = stagnation.bestSignal;
    stagnantDepths = stagnation.stagnantDepths;
    currentBeam = levelResults
      .filter(({ result }) => canExpandResult(result, options))
      .slice(0, beamWidth);

    trace.levels.push({
      size,
      candidateKeys: levelResults.map(({ result }) => result.key),
      retainedKeys: currentBeam.map(({ result }) => result.key),
      levelBestSignal,
      bestSignal,
      stagnantDepths,
    });

    if (!currentBeam.length || stagnantDepths >= options.stagnationDepthLimit) {
      break;
    }
  }

  return {
    mode: "beam_forward",
    evaluatedResults: Array.from(evaluatedResults.values()),
    trace,
  };
}
