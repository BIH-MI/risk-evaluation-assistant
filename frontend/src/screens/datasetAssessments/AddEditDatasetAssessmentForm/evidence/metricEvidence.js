import { summarizeSubsetEvidence } from "qidDiscovery";

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

// Contextual evidence ("in combination with other attributes") is the
// equally weighted mean over the persisted per-subset-size evidence.
function buildSubsetContext(attribute) {
  const overall = summarizeSubsetEvidence(attribute?.subsetEvidence || []);
  return overall ? { overall } : null;
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
