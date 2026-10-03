const individualDistinguishabilityFields = [
  "distinction",
  "separation",
  "singletonFraction",
  "minimumEquivalenceClassSize",
  "medianEquivalenceClassSize",
  "maximumEquivalenceClassSize",
];

const hasValue = (value) => value !== null && value !== undefined;

function pickExistingFields(source, fields) {
  return fields.reduce((acc, field) => {
    if (hasValue(source?.[field])) {
      acc[field] = source[field];
    }
    return acc;
  }, {});
}

function mean(values) {
  const numericValues = values
    .map(Number)
    .filter((value) => Number.isFinite(value));

  return numericValues.length
    ? numericValues.reduce((sum, value) => sum + value, 0) /
        numericValues.length
    : null;
}

function buildSubsetContext(attribute) {
  const bySubsetSize = (attribute?.subsetEvidence || [])
    .filter((evidence) => hasValue(evidence.subsetSize))
    .map((evidence) => ({
      subsetSize: evidence.subsetSize,
      evaluatedSubsetCount: evidence.evaluatedSubsetCount,
      meanDistinction: evidence.meanDistinction,
      meanSeparation: evidence.meanSeparation,
      meanSingletonFraction: evidence.meanSingletonFraction,
    }))
    .sort((left, right) => left.subsetSize - right.subsetSize);

  if (!bySubsetSize.length) return null;

  return {
    bySubsetSize,
    overall: {
      evaluatedSubsetCount: bySubsetSize.reduce(
        (sum, evidence) => sum + (Number(evidence.evaluatedSubsetCount) || 0),
        0
      ),
      maxSubsetSize: bySubsetSize[bySubsetSize.length - 1].subsetSize,
      meanDistinction: mean(
        bySubsetSize.map((evidence) => evidence.meanDistinction)
      ),
      meanSeparation: mean(
        bySubsetSize.map((evidence) => evidence.meanSeparation)
      ),
      meanSingletonFraction: mean(
        bySubsetSize.map((evidence) => evidence.meanSingletonFraction)
      ),
    },
  };
}

export function buildDistinguishabilityQuantitativeEvidence(attribute) {
  const individual = pickExistingFields(
    attribute,
    individualDistinguishabilityFields
  );
  const subsetContext = buildSubsetContext(attribute);

  if (!Object.keys(individual).length && !subsetContext) return null;

  return {
    individual: Object.keys(individual).length ? individual : null,
    subsetContext,
  };
}
