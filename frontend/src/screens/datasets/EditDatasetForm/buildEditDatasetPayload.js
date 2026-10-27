import { toDatasetAttributePayload } from "screens/datasets/utils/attributePayload";

/**
 * Builds the API shape for one edited table. Attributes are always preserved so
 * excluded identifiers remain part of the dataset schema.
 */
function buildTablePayload(table) {
  return {
    id: table.id,
    name: table.name,
    attributes: (table.attributes || []).map(toDatasetAttributePayload),
  };
}

/**
 * Converts Edit Dataset form state into the update payload while keeping raw
 * data out of the request.
 */
export function buildEditDatasetPayload(
  tables,
  {
    name,
    description,
    datasetType,
    sharedUsernames,
    qidDiscoveryConfigurationId,
    qidDiscoveryConfigurationVersionId,
  }
) {
  return {
    name: name.trim(),
    description: description.trim(),
    datasetType: datasetType || null,
    qidDiscoveryConfigurationId,
    qidDiscoveryConfigurationVersionId,
    sharedUsernames,
    tables: tables.map(buildTablePayload),
  };
}
