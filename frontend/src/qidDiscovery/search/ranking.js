/**
 * QID combination search configuration.
 *
 * exactSearchMaxCandidateCount:
 *   This is the maximum number of eligible candidate attributes for systematic
 *   Exact Level-Wise search. Above this value Beam search is used.
 *   Computational parameter only.
 *
 * maxCombinationSize:
 *   Used by Exact and Beam search. Maximum number of attributes allowed in one
 *   searched combination. For example, 4 searches singles, pairs, triples, and
 *   quadruples. Computational/search parameter only.
 *
 * beamWidth:
 *   Used by Beam search only. Maximum number of ranked expandable candidates
 *   retained at each search depth. Larger explores more branches but is
 *   slower. Computational parameter.
 *
 * maxPersistedCombinations:
 *   Used after search. Maximum number of selected aggregate combination
 *   results included in the dataset payload/database. This does not limit how
 *   many combinations may be evaluated internally.
 *
 * targetDistinction:
 *   Used by Exact and Beam pruning. If a candidate reaches both
 *   targetDistinction and targetSeparation, it is not expanded further. This
 *   is a search-control parameter.
 *
 * targetSeparation:
 *   Used by Exact and Beam pruning with the same interpretation as
 *   targetDistinction. Search-control parameter only.
 *
 * distinctionWeight:
 *   Used by calculateSearchScore(). Relative contribution of Distinction to
 *   candidate ranking.
 *
 * separationWeight:
 *   Used by calculateSearchScore(). Relative contribution of Separation to
 *   candidate ranking.
 *
 * attributeCountPenalty:
 *   Used by calculateSearchScore(). Penalizes unnecessarily large attribute
 *   combinations so smaller combinations are preferred when evidence is
 *   similar.
 *
 * minImprovement:
 *   Used by Beam search only. Minimum improvement in the best level signal
 *   considered meaningful. Signal currently means Distinction + Separation.
 *
 * stagnationDepthLimit:
 *   Used by Beam search only. Number of consecutive depths that may fail to
 *   improve by at least minImprovement before Beam search terminates.
 *
 * Distinction and Separation are quantitative dataset evidence. Score ranks
 * candidates. Signal controls Beam-depth stagnation. targetSatisfied controls
 * branch pruning.
 */
export const DEFAULT_QID_DISCOVERY_OPTIONS = Object.freeze({
  exactSearchMaxCandidateCount: 8,
  maxCombinationSize: 4,
  beamWidth: 10,
  maxPersistedCombinations: 20,
  targetDistinction: 0.95,
  targetSeparation: 0.95,
  minImprovement: 0.000001,
  stagnationDepthLimit: 2,
  distinctionWeight: 0.7,
  separationWeight: 0.3,
  attributeCountPenalty: 0.03,
});

/**
 * Merges caller overrides with documented defaults. These values control
 * search cost, pruning, ranking, and result retention; they do not define
 * final QID status.
 */
export function mergeQidDiscoveryOptions(options = {}) {
  return {
    ...DEFAULT_QID_DISCOVERY_OPTIONS,
    ...options,
  };
}

/**
 * Calculates the score used to rank candidates. Exact search uses the score
 * for ordering only; Beam search also uses it to decide which branches remain
 * in the beam.
 */
export function calculateSearchScore(result, options) {
  const weightedSignal =
    result.distinction * options.distinctionWeight +
    result.separation * options.separationWeight;
  return (
    weightedSignal - (result.attributeCount - 1) * options.attributeCountPenalty
  );
}

/**
 * Returns true when both configured search targets are reached. This controls
 * branch pruning only and must not be treated as final privacy classification.
 */
export function isTargetSatisfied(result, options) {
  return (
    result.distinction >= options.targetDistinction &&
    result.separation >= options.targetSeparation
  );
}

/**
 * A perfectly distinguishing candidate cannot become more distinguishing by
 * adding attributes, so search does not expand that branch.
 */
export function isPerfectlyDistinguishing(result) {
  return result.distinction >= 1 && result.separation >= 1;
}

/**
 * Decides whether a candidate can be expanded into larger combinations.
 * Expansion stops at maxCombinationSize, when the search target is satisfied,
 * or when the candidate is already perfectly distinguishing.
 */
export function canExpandResult(result, options) {
  return (
    result.attributeCount < options.maxCombinationSize &&
    !isTargetSatisfied(result, options) &&
    !isPerfectlyDistinguishing(result)
  );
}

/**
 * Deterministically orders candidates by score, size, Distinction, Separation,
 * and stable cache key. Sorting does not itself persist or discard results.
 */
export function compareSearchResults(left, right) {
  if (right.score !== left.score) return right.score - left.score;
  if (left.attributeCount !== right.attributeCount) {
    return left.attributeCount - right.attributeCount;
  }
  if (right.distinction !== left.distinction) {
    return right.distinction - left.distinction;
  }
  if (right.separation !== left.separation) {
    return right.separation - left.separation;
  }
  return left.key.localeCompare(right.key);
}
