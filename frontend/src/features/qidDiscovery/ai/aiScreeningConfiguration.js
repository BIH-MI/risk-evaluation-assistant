import {
  AI_DEFAULT_MODEL_ID,
  getColumnClassifierModel,
  isColumnClassifierModelSupported,
} from "./modelConfig";

/*
 * AI-assisted direct-identifier screening settings of a QID discovery
 * configuration version ({ enabled, allowedModelIds, defaultModelId }).
 * Model ids are registry ids (modelRegistry.json). Versions saved with the
 * former `allowResearcherSelection` field keep it stored, but it is ignored:
 * researchers choose whenever more than one allowed model is usable.
 */

// Used when a configuration carries no aiScreening object. The backend
// reports versions saved before AI screening was configurable with its
// QidDiscoveryAiScreeningDefaults (same values, `legacyDefaults: true`).
export const LEGACY_AI_SCREENING_SETTINGS = Object.freeze({
  enabled: true,
  allowedModelIds: Object.freeze([AI_DEFAULT_MODEL_ID]),
  defaultModelId: AI_DEFAULT_MODEL_ID,
});

/** The configuration's AI screening settings, with legacy defaults. */
export function getAiScreeningSettings(configuration) {
  const aiScreening = configuration?.aiScreening;
  if (!aiScreening) return LEGACY_AI_SCREENING_SETTINGS;
  return {
    enabled: aiScreening.enabled !== false,
    allowedModelIds: Array.isArray(aiScreening.allowedModelIds)
      ? aiScreening.allowedModelIds
      : [],
    defaultModelId: aiScreening.defaultModelId || null,
  };
}

// Installation states reported by the backend (GET /api/ai-models).
export const AI_INSTALL_STATES = Object.freeze({
  NOT_INSTALLED: "NOT_INSTALLED",
  INSTALLING: "INSTALLING",
  INSTALLED: "INSTALLED",
  FAILED: "FAILED",
});

/**
 * Installation of the registry models from the backend's statuses. A model
 * counts as installed only for the revision this build pins.
 *
 * @returns {{ installedModelIds: string[], models: Object<string, Object> }}
 */
export function describeModelInstallations(statuses = []) {
  const models = {};
  statuses.forEach((status) => {
    const model = getColumnClassifierModel(status?.modelId);
    if (!model) return;
    const installed =
      status.state === AI_INSTALL_STATES.INSTALLED &&
      status.revision === model.revision;
    models[model.id] = {
      ...status,
      state:
        status.state === AI_INSTALL_STATES.INSTALLED && !installed
          ? AI_INSTALL_STATES.NOT_INSTALLED
          : status.state,
      installed,
    };
  });
  return {
    installedModelIds: Object.keys(models).filter((id) => models[id].installed),
    models,
  };
}

/** True when this build supports the model and its files are installed. */
export function isColumnClassifierModelUsable(modelId, installedModelIds = []) {
  const model = getColumnClassifierModel(modelId);
  return (
    isColumnClassifierModelSupported(model) &&
    installedModelIds.includes(model.id)
  );
}

/**
 * What Add Dataset offers for a configuration: the allowed models that are
 * supported and installed, the model to preselect, and whether researchers
 * choose (more than one usable model). One usable model is used
 * automatically if it is the configured default. Another model is never
 * substituted silently for an unusable default: with several usable models
 * the researcher picks one (nothing is preselected), otherwise no model is
 * used and AI suggestions report themselves as unavailable.
 *
 * `unavailableModelIds` lists allowed models that cannot be used here (not
 * supported by this build or not installed), so the reason can be shown.
 *
 * @returns {{ enabled: boolean, models: Object[], defaultModelId: string|null,
 *   allowSelection: boolean, configuredDefaultModelId: string|null,
 *   unavailableModelIds: string[] }}
 */
export function resolveAiScreeningModels(
  configuration,
  installedModelIds = []
) {
  const settings = getAiScreeningSettings(configuration);
  if (!settings.enabled) {
    return {
      enabled: false,
      models: [],
      defaultModelId: null,
      allowSelection: false,
      configuredDefaultModelId: settings.defaultModelId,
      unavailableModelIds: [],
    };
  }

  const usable = settings.allowedModelIds
    .filter((modelId) =>
      isColumnClassifierModelUsable(modelId, installedModelIds)
    )
    .map(getColumnClassifierModel);
  const unavailableModelIds = settings.allowedModelIds.filter(
    (modelId) => !usable.some((model) => model.id === modelId)
  );
  const defaultUsable = usable.some(
    (model) => model.id === settings.defaultModelId
  );
  const allowSelection = usable.length > 1;
  return {
    enabled: true,
    configuredDefaultModelId: settings.defaultModelId,
    unavailableModelIds,
    models: allowSelection || defaultUsable ? usable : [],
    defaultModelId: defaultUsable ? settings.defaultModelId : null,
    allowSelection,
  };
}

/**
 * Default model after the allowed models change: the current default while
 * it is still allowed, else REA's default model if allowed, else the first
 * allowed model ("" when none is allowed).
 */
export function chooseAiDefaultModelId(allowedModelIds, currentDefaultModelId) {
  if (allowedModelIds.includes(currentDefaultModelId))
    return currentDefaultModelId;
  if (allowedModelIds.includes(AI_DEFAULT_MODEL_ID)) return AI_DEFAULT_MODEL_ID;
  return allowedModelIds[0] || "";
}
