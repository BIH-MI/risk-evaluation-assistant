import { toDatasetAttributePayload } from "screens/datasets/utils/attributePayload";
import { getAiScreeningProvenance } from "features/qidDiscovery/ai/columnSuggestions";

function buildTablePayload(table) {
  const displayName = table.name || "";

  return {
    name: displayName.replace(/\.csv$/i, ""),
    attributes: (table.columnMeta || []).map(toDatasetAttributePayload),
  };
}

// The AI model that screened the column names: registry id, pinned
// revision, quantisation, prompt profile and column-name rules, thresholds
// and validation status. null when no model was used.
function buildAiScreeningPayload(modelId) {
  return modelId ? getAiScreeningProvenance(modelId) : null;
}

/**
 * Converts Add Dataset form state into the API request payload. Raw preview
 * rows, encoded columns, and subset partitions stay browser-local.
 *
 * @param {Object} options Current form fields and the selected configuration.
 * @param {Object[]} options.tables Local tables; only schema/evidence is mapped.
 * @param {Object} options.selectedQidDiscoveryConfiguration Must have id/versionId.
 * @param {string|null} [options.aiScreeningModelId=null] Model that actually ran,
 * not merely the selected or preloaded model. The caller determines this.
 * @returns {Object} Existing dataset-create API request, with no worker/UI state.
 */
export function buildDatasetPayload({
  name,
  description,
  sharedUsers,
  selectedQidDiscoveryConfiguration,
  aiScreeningModelId = null,
  tables,
}) {
  return {
    name: name.trim(),
    description: description.trim(),
    qidDiscoveryConfigurationId: selectedQidDiscoveryConfiguration.id,
    qidDiscoveryConfigurationVersionId:
      selectedQidDiscoveryConfiguration.versionId,
    aiScreening: buildAiScreeningPayload(aiScreeningModelId),
    sharedUsernames: sharedUsers.map((user) => user.username),
    tables: tables.map(buildTablePayload),
  };
}
