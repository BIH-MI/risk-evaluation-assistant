// Abstention thresholds on the (uncalibrated) zero-shot score, as named
// profiles referenced by registry entries ("thresholdProfile"). Scores of
// different models or prompt profiles are not comparable, and validation
// records refer to a profile's exact values by fingerprint (modelConfig.js):
// add a new profile instead of changing one.
const AI_THRESHOLD_PROFILES = Object.freeze({
  // A prediction is confident only when one label clearly dominates;
  // anything else is left to the researcher. Evaluated only with
  // DeBERTaV3-XSmall and prompt profile column-zero-shot-v2.
  "zero-shot-abstention-v1": Object.freeze({
    minTopScore: 0.5,
    minMargin: 0.2,
    // A non-identifier winner is still uncertain when an identifier label
    // scores at least this much: an unrecognised column is never assumed
    // to be free of identifiers.
    maxIdentifierScoreBehindNonIdentifier: 0.25,
  }),
});

/** The thresholds a model's scores are interpreted with. */
export function getModelThresholds(model) {
  const thresholds = AI_THRESHOLD_PROFILES[model?.thresholdProfile];
  if (!thresholds) {
    throw new Error(`Unknown AI threshold profile: ${model?.thresholdProfile}`);
  }
  return thresholds;
}
