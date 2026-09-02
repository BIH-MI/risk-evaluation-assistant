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
 *
 * Search targets control candidate expansion only. They are independent from
 * qualitative Distinguishability assessment thresholds.
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
