import { DEFAULT_QID_DISCOVERY_PROFILING_CONFIGURATION } from "features/qidDiscovery/configuration/defaults";
import {
  getAiScreeningSettings,
  isColumnClassifierModelUsable,
  LEGACY_AI_SCREENING_SETTINGS,
} from "features/qidDiscovery/ai/aiScreeningConfiguration";
import {
  getColumnClassifierModel,
  isColumnClassifierModelSupported,
} from "features/qidDiscovery/ai/modelConfig";

const aiScreeningToForm = (settings) => ({
  enabled: settings.enabled,
  allowedModelIds: [...settings.allowedModelIds],
  defaultModelId: settings.defaultModelId || "",
});

export const emptyQidDiscoveryConfigurationForm = () => ({
  id: null,
  name: "",
  description: "",
  active: true,
  defaultConfiguration: false,
  versionNumber: 1,
  profiling: {
    maxSubsetSize: String(
      DEFAULT_QID_DISCOVERY_PROFILING_CONFIGURATION.maxSubsetSize
    ),
    maxEvaluatedSubsets: String(
      DEFAULT_QID_DISCOVERY_PROFILING_CONFIGURATION.maxEvaluatedSubsets
    ),
  },
  aiScreening: aiScreeningToForm(LEGACY_AI_SCREENING_SETTINGS),
});

export function normalizeQidConfigurationToForm(configuration) {
  const empty = emptyQidDiscoveryConfigurationForm();
  const profiling = configuration?.profiling || {};

  return {
    id: configuration.id,
    name: configuration.name || "",
    description: configuration.description || "",
    active: Boolean(configuration.active),
    defaultConfiguration: Boolean(configuration.defaultConfiguration),
    versionNumber:
      configuration.versionNumber || configuration.currentVersion || 1,
    profiling: {
      maxSubsetSize: String(
        profiling.maxSubsetSize ?? empty.profiling.maxSubsetSize
      ),
      maxEvaluatedSubsets: String(
        profiling.maxEvaluatedSubsets ?? empty.profiling.maxEvaluatedSubsets
      ),
    },
    // Configurations saved before AI screening was configurable get the
    // settings they have been using (legacy defaults).
    aiScreening: aiScreeningToForm(getAiScreeningSettings(configuration)),
  };
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
};

function addNumberError(
  t,
  errors,
  key,
  value,
  fieldLabelKey,
  { integer, min } = {}
) {
  const number = toNumber(value);
  const field = t(fieldLabelKey);

  if (number === null) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldRequired", {
      field,
    });
    return;
  }
  if (Number.isNaN(number)) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldInvalidNumber", {
      field,
    });
    return;
  }
  if (integer && !Number.isInteger(number)) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldNotInteger", {
      field,
    });
    return;
  }
  if (min !== undefined && number < min) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldBelowMin", {
      field,
      min,
    });
  }
}

/**
 * AI screening must name at least one model when enabled and the default
 * must be one of the allowed models. Every allowed model must be supported
 * by this build (the backend rejects other ids as well) and, when screening
 * is enabled, installed. If the installation status could not be loaded,
 * installation is unknown: the editor shows that instead of treating every
 * model as missing, so other settings can still be saved.
 */
function validateAiScreening(t, aiScreening, aiInstallation) {
  const errors = {};
  const key = (name) => `qidDiscoveryConfiguration.aiScreening.errors.${name}`;
  const unsupported = aiScreening.allowedModelIds.filter(
    (modelId) =>
      !isColumnClassifierModelSupported(getColumnClassifierModel(modelId))
  );
  // Disabled screening keeps its model list but never uses it.
  const notInstalled =
    aiScreening.enabled && aiInstallation?.status === "ok"
      ? aiScreening.allowedModelIds.filter(
          (modelId) =>
            !unsupported.includes(modelId) &&
            !isColumnClassifierModelUsable(
              modelId,
              aiInstallation.installedModelIds
            )
        )
      : [];
  if (unsupported.length) {
    errors.allowedModelIds = t(key("modelsUnsupported"), {
      models: unsupported.join(", "),
    });
  } else if (notInstalled.length) {
    errors.allowedModelIds = t(key("modelsUnavailable"), {
      models: notInstalled.join(", "),
    });
  } else if (aiScreening.enabled && !aiScreening.allowedModelIds.length) {
    errors.allowedModelIds = t(key("modelsRequired"));
  }
  if (aiScreening.enabled && !aiScreening.defaultModelId) {
    errors.defaultModelId = t(key("defaultRequired"));
  } else if (
    aiScreening.defaultModelId &&
    !aiScreening.allowedModelIds.includes(aiScreening.defaultModelId)
  ) {
    errors.defaultModelId = t(key("defaultNotAllowed"));
  }
  return errors;
}

export function validateQidConfigurationForm(
  t,
  form,
  existingConfigurations = [],
  { aiInstallation = null } = {}
) {
  const fields = {};
  const profiling = {};
  const aiScreening = validateAiScreening(t, form.aiScreening, aiInstallation);

  if (!form.name.trim()) {
    fields.name = t("qidDiscoveryConfiguration.errors.nameRequired");
  } else {
    const duplicateName = existingConfigurations.some(
      (configuration) =>
        configuration.id !== form.id &&
        String(configuration.name || "")
          .trim()
          .toLowerCase() === form.name.trim().toLowerCase()
    );
    if (duplicateName) {
      fields.name = t("qidDiscoveryConfiguration.errors.nameNotUnique");
    }
  }

  if (form.defaultConfiguration && !form.active) {
    fields.defaultConfiguration = t(
      "qidDiscoveryConfiguration.errors.defaultNotActive"
    );
  }

  addNumberError(
    t,
    profiling,
    "maxSubsetSize",
    form.profiling.maxSubsetSize,
    "qidDiscoveryConfiguration.fields.maxSubsetSize",
    { integer: true, min: 1 }
  );
  addNumberError(
    t,
    profiling,
    "maxEvaluatedSubsets",
    form.profiling.maxEvaluatedSubsets,
    "qidDiscoveryConfiguration.fields.maxEvaluatedSubsets",
    { integer: true, min: 1 }
  );

  return { fields, profiling, aiScreening };
}

export const hasQidConfigurationFormErrors = (errors) =>
  Object.keys(errors.fields).length > 0 ||
  Object.keys(errors.profiling).length > 0 ||
  Object.keys(errors.aiScreening).length > 0;

const payloadNumber = (value) =>
  value === null || value === undefined || value === "" ? null : Number(value);

export function qidConfigurationFormToPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    active: Boolean(form.active),
    defaultConfiguration: Boolean(form.defaultConfiguration),
    profiling: {
      maxSubsetSize: payloadNumber(form.profiling.maxSubsetSize),
      maxEvaluatedSubsets: payloadNumber(form.profiling.maxEvaluatedSubsets),
    },
    aiScreening: {
      enabled: Boolean(form.aiScreening.enabled),
      allowedModelIds: form.aiScreening.allowedModelIds,
      defaultModelId: form.aiScreening.defaultModelId || null,
    },
  };
}
