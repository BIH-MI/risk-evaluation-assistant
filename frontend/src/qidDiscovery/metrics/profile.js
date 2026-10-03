import { summarizeClassSizes, summarizeSingletons } from "./equivalenceClasses";
import { calculateDistinction } from "./distinction";
import { calculateSeparation } from "./separation";

const ratio = (numerator, denominator) =>
  denominator ? numerator / denominator : 0;

/**
 * Converts the equivalence-class distribution of one observed source
 * attribute into aggregate statistics used later as quantitative QID evidence.
 * The input is produced by profileAndEncodeColumn's single pass over the
 * original column and the returned object is safe to persist.
 */
export function buildAttributeStatistics(profile) {
  const {
    recordCount,
    analysedRecordCount,
    missingCount,
    classSizes = profile.frequency
      ? Array.from(profile.frequency.values())
      : [],
  } = profile;
  const equivalenceClassCount = classSizes.length;
  const { singletonClassCount, singletonRecordCount } =
    summarizeSingletons(classSizes);
  const statistics = {
    recordCount,
    analysedRecordCount,
    missingCount,
    missingFraction: ratio(missingCount, analysedRecordCount),
    distinctValueCount: equivalenceClassCount,
    distinctValueRatio: ratio(equivalenceClassCount, analysedRecordCount),
    singletonValueCount: singletonClassCount,
    singletonRecordCount,
    singletonFraction: ratio(singletonRecordCount, analysedRecordCount),
    ...summarizeClassSizes(classSizes),
    distinction: calculateDistinction(
      equivalenceClassCount,
      analysedRecordCount
    ),
    separation: calculateSeparation(classSizes, analysedRecordCount),
  };

  return statistics;
}

/**
 * Converts a joint equivalence-class partition into aggregate statistics for an
 * attribute subset. The partition and row group IDs that produced these
 * statistics remain transient browser-local cache state.
 */
export function buildSubsetStatistics(
  stableAttributeIds,
  classSizes,
  analysedRecordCount
) {
  const equivalenceClassCount = classSizes.length;
  const { singletonClassCount, singletonRecordCount } =
    summarizeSingletons(classSizes);

  return {
    stableAttributeIds,
    attributeCount: stableAttributeIds.length,
    distinction: calculateDistinction(
      equivalenceClassCount,
      analysedRecordCount
    ),
    separation: calculateSeparation(classSizes, analysedRecordCount),
    equivalenceClassCount,
    singletonClassCount,
    singletonRecordCount,
    singletonFraction: ratio(singletonRecordCount, analysedRecordCount),
    ...summarizeClassSizes(classSizes),
  };
}
