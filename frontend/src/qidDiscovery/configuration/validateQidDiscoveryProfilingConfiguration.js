function requireProfilingConfiguration(profilingConfiguration) {
  if (!profilingConfiguration || typeof profilingConfiguration !== "object") {
    throw new Error("QID discovery profiling configuration is required.");
  }
}

function toInteger(value, label, { required = true, min } = {}) {
  if (value === null || value === undefined || value === "") {
    if (!required) return null;
    throw new Error(`${label} is required.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be an integer.`);
  }
  if (min !== undefined && number < min) {
    throw new Error(`${label} must be greater than or equal to ${min}.`);
  }

  return number;
}

export function validateQidDiscoveryProfilingConfiguration(
  profilingConfiguration
) {
  requireProfilingConfiguration(profilingConfiguration);

  return {
    maxSubsetSize: toInteger(
      profilingConfiguration.maxSubsetSize,
      "Maximum Subset Size",
      { min: 1 }
    ),
    maxEvaluatedSubsets: toInteger(
      profilingConfiguration.maxEvaluatedSubsets,
      "Maximum Evaluated Subsets",
      { min: 1 }
    ),
  };
}

/**
 * Safe wrapper for callers that only need a validation message (or none) for
 * a whole QID Discovery Configuration, e.g. to surface a problem as soon as a
 * configuration is selected rather than only once profiling starts.
 */
export function getQidConfigurationValidationError(configuration) {
  try {
    validateQidDiscoveryProfilingConfiguration(configuration?.profiling);
    return "";
  } catch (error) {
    return error.message;
  }
}
