import { toDatasetAttributePayload } from "qidDiscovery";

function buildTablePayload(table) {
  const displayName = table.name || "";

  return {
    name: displayName.replace(/\.csv$/i, ""),
    attributes: (table.columnMeta || []).map(toDatasetAttributePayload),
  };
}

/**
 * Converts Add Dataset form state into the API request payload. Raw preview
 * rows, encoded columns, and subset partitions stay browser-local.
 */
export function buildAddDatasetPayload({
  name,
  description,
  sharedUsers,
  selectedQidDiscoveryConfiguration,
  tables,
}) {
  return {
    name: name.trim(),
    description: description.trim(),
    qidDiscoveryConfigurationId: selectedQidDiscoveryConfiguration.id,
    qidDiscoveryConfigurationVersionId:
      selectedQidDiscoveryConfiguration.versionId,
    sharedUsernames: sharedUsers.map((user) => user.username),
    tables: tables.map(buildTablePayload),
  };
}
