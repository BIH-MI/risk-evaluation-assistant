import {
  toDatasetAttributePayload,
  toDatasetQidCombinationPayload,
} from "qidDiscovery/payload";

const hasPersistedAttributeId = (id) =>
  id !== null && id !== undefined && typeof id !== "string";

function getIncludedAttributeIdentity(attributes = []) {
  const includedAttributes = attributes.filter(
    (attribute) => !Boolean(attribute.excluded)
  );

  return {
    includedAttributeIds: new Set(
      includedAttributes
        .map((attribute) => attribute.id)
        .filter(hasPersistedAttributeId)
        .map(String)
    ),
    includedAttributeNames: new Set(
      includedAttributes.map((attribute) => attribute.name)
    ),
  };
}

function combinationReferencesIncludedAttributes(
  combination,
  includedAttributeIds,
  includedAttributeNames
) {
  if (combination.attributeIds?.length) {
    return combination.attributeIds.every((attributeId) =>
      includedAttributeIds.has(String(attributeId))
    );
  }

  const attributeNames = combination.attributeNames || [];
  return (
    attributeNames.length > 0 &&
    attributeNames.every((attributeName) =>
      includedAttributeNames.has(attributeName)
    )
  );
}

/**
 * Builds the API shape for one edited table. Attributes are always preserved so
 * excluded identifiers remain part of the dataset schema; saved QID combinations
 * are kept only when every referenced attribute is currently included.
 */
function buildTablePayload(table) {
  const { includedAttributeIds, includedAttributeNames } =
    getIncludedAttributeIdentity(table.attributes);

  return {
    id: table.id,
    name: table.name,
    attributes: (table.attributes || []).map(toDatasetAttributePayload),
    qidCombinations: (table.qidCombinations || [])
      .filter((combination) =>
        combinationReferencesIncludedAttributes(
          combination,
          includedAttributeIds,
          includedAttributeNames
        )
      )
      .map(toDatasetQidCombinationPayload),
  };
}

/**
 * Converts Edit Dataset form state into the update payload while keeping raw
 * data out of the request. Exclusion affects persisted QID combinations, not
 * whether the attribute itself is saved.
 */
export function buildEditDatasetPayload(
  tables,
  {
    name,
    description,
    sharedUsernames,
    qidDiscoveryConfigurationId,
    qidDiscoveryConfigurationVersionId,
  }
) {
  return {
    name: name.trim(),
    description: description.trim(),
    qidDiscoveryConfigurationId,
    qidDiscoveryConfigurationVersionId,
    sharedUsernames,
    tables: tables.map(buildTablePayload),
  };
}
