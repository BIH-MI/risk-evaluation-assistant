import { summarizeClassSizes, summarizeSingletons } from "./equivalenceClasses";
import { calculateDistinction } from "./distinction";
import { calculateSeparation } from "./separation";

const ratio = (numerator, denominator) =>
  denominator ? numerator / denominator : 0;

/**
 * Converts the equivalence-class distribution of one observed source
 * attribute into aggregate statistics used as quantitative Distinguishability
 * evidence.
 * The input is produced by profileAndEncodeColumn's single pass over the
 * original column and the returned object is safe to persist.
 */
export function buildAttributeStatistics(profile) {
  const { recordCount, analysedRecordCount, missingCount, classSizes } =
    profile;
  const equivalenceClassCount = classSizes.length;
  const { singletonClassCount, singletonRecordCount } =
    summarizeSingletons(classSizes);

  return {
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
}

/**
 * Converts a joint equivalence-class partition into the metrics that are
 * aggregated into per-attribute, per-subset-size Distinguishability evidence.
 * The partition that produced them remains transient browser-local cache state;
 * subset identities are never part of the result.
 */
export function buildSubsetStatistics(classSizes, analysedRecordCount) {
  const { singletonRecordCount } = summarizeSingletons(classSizes);

  return {
    distinction: calculateDistinction(classSizes.length, analysedRecordCount),
    separation: calculateSeparation(classSizes, analysedRecordCount),
    singletonFraction: ratio(singletonRecordCount, analysedRecordCount),
  };
}
