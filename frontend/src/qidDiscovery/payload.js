// Persisted attribute fields are aggregate statistics only. Raw rows, observed
// values, frequency maps, encoded columns, partitions, and cache entries stay
// transient in the browser/worker.
export const ATTRIBUTE_STATISTIC_FIELDS = [
  "recordCount",
  "analysedRecordCount",
  "missingCount",
  "missingFraction",
  "distinctValueCount",
  "distinctValueRatio",
  "singletonValueCount",
  "singletonRecordCount",
  "singletonFraction",
  "minimumEquivalenceClassSize",
  "medianEquivalenceClassSize",
  "maximumEquivalenceClassSize",
  "distinction",
  "separation",
];

export const QID_COMBINATION_STATISTIC_FIELDS = [
  "attributeCount",
  "distinction",
  "separation",
  "equivalenceClassCount",
  "singletonClassCount",
  "singletonRecordCount",
  "singletonFraction",
  "minimumEquivalenceClassSize",
  "medianEquivalenceClassSize",
  "maximumEquivalenceClassSize",
];

/**
 * Converts UI attribute metadata into the dataset API payload.
 */
export function toDatasetAttributePayload(attribute) {
  const payload = {
    id: typeof attribute.id === "string" ? null : attribute.id,
    name: attribute.field || attribute.name,
    dataType: attribute.level || attribute.dataType,
    excluded: Boolean(attribute.excluded ?? attribute.isExcluded),
  };
  const statistics = attribute.statistics || attribute;

  ATTRIBUTE_STATISTIC_FIELDS.forEach((field) => {
    if (statistics[field] !== undefined) {
      payload[field] = statistics[field];
    }
  });

  return payload;
}

/**
 * Converts a selected QID combination into the dataset API payload.
 */
export function toDatasetQidCombinationPayload(combination) {
  const payload = {};

  if (combination.id !== undefined) payload.id = combination.id;
  if (combination.attributeIds !== undefined) {
    payload.attributeIds = combination.attributeIds;
  }
  if (combination.attributeNames !== undefined) {
    payload.attributeNames = combination.attributeNames;
  }

  QID_COMBINATION_STATISTIC_FIELDS.forEach((field) => {
    if (combination[field] !== undefined) {
      payload[field] = combination[field];
    }
  });

  return payload;
}
