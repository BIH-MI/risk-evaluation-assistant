import { toDatasetAttributePayload } from "screens/datasets/utils/attributePayload";
import { getAiScreeningProvenance } from "features/qidDiscovery/ai/columnSuggestions";
import { getTableAiState } from "features/qidDiscovery/ai/aiSuggestionTableState";
import { getTableScreenings } from "features/qidDiscovery/ai/screeningStatus";
import { toScreeningSnapshot } from "features/qidDiscovery/ai/screeningSnapshot";

// Each attribute carries a snapshot of its screening as displayed, so Edit
// Dataset can show the same status and details.
function buildTablePayload(table, { aiStateByTable, aiScreeningEnabled }) {
  const displayName = table.name || "";
  const screenings = getTableScreenings({
    table,
    aiState: getTableAiState(aiStateByTable, table._localTableId),
    aiEnabled: aiScreeningEnabled,
  });

  return {
    name: displayName.replace(/\.csv$/i, ""),
    attributes: screenings.map(({ column, screening }) =>
      toDatasetAttributePayload({
        ...column,
        screening: toScreeningSnapshot(screening, column.field),
      })
    ),
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
 * @param {Object} [options.aiStateByTable={}] AI state per local table id.
 * @param {boolean} [options.aiScreeningEnabled=true] AI screening was enabled.
 * @param {string|null} [options.datasetType=null] Type chosen by the researcher.
 * @param {{type: string, score: number}|null} [options.datasetTypeSuggestion=null]
 * The AI model's dataset-type suggestion (recorded with the model's provenance).
 * @returns {Object} Existing dataset-create API request, with no worker/UI state.
 */
export function buildDatasetPayload({
  name,
  description,
  sharedUsers,
  selectedQidDiscoveryConfiguration,
  aiScreeningModelId = null,
  aiStateByTable = {},
  aiScreeningEnabled = true,
  datasetType = null,
  datasetTypeSuggestion = null,
  tables,
}) {
  return {
    name: name.trim(),
    description: description.trim(),
    qidDiscoveryConfigurationId: selectedQidDiscoveryConfiguration.id,
    qidDiscoveryConfigurationVersionId:
      selectedQidDiscoveryConfiguration.versionId,
    aiScreening: buildAiScreeningPayload(aiScreeningModelId),
    datasetType: datasetType || null,
    aiSuggestedDatasetType: aiScreeningModelId
      ? datasetTypeSuggestion?.type ?? null
      : null,
    aiSuggestedDatasetTypeScore: aiScreeningModelId
      ? datasetTypeSuggestion?.score ?? null
      : null,
    sharedUsernames: sharedUsers.map((user) => user.username),
    tables: tables.map((table) =>
      buildTablePayload(table, { aiStateByTable, aiScreeningEnabled })
    ),
  };
}
