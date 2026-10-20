import { apiUrl } from "api/httpClient";

import modelRegistry from "./modelRegistry.json";
import { getPromptProfile } from "./promptProfiles";
import { getModelThresholds } from "./thresholds";

/*
 * Browser-local column classifier models.
 *
 * modelRegistry.json is the single source of truth. The backend reads the
 * same file to install model files (pinned revision, SHA-256 hashes) and
 * serve them from REA's origin. Adding a compatible zero-shot NLI model means
 * adding an entry there; nothing else refers to a specific model.
 *
 * Entry fields:
 * - id: stable REA identifier (configuration, cache keys, provenance).
 * - displayName: shown to administrators and researchers.
 * - repository / revision: Hugging Face repository and pinned commit.
 * - task / device / dtype: Transformers.js pipeline task, execution backend
 *   and quantisation ("q8" = onnx/model_quantized.onnx).
 * - strategy: classification adapter in the worker (AI_CLASSIFICATION_STRATEGIES).
 * - promptProfile / thresholdProfile: what the model is asked
 *   (promptProfiles.js) and how its scores are read (thresholds.js).
 * - availability: "enabled" or "disabled" (whether this build offers it).
 * - installByDefault: installed by the backend on startup.
 * - validations: evaluations of exact configurations (see getValidation).
 *   Only add one after an actual evaluation, and never edit recorded results.
 * - assets: model files and their SHA-256 hashes (used by the backend).
 */

export const AI_CLASSIFICATION_STRATEGIES = Object.freeze({
  ZERO_SHOT_NLI: "zero-shot-nli",
});

// FNV-1a (32 bit) of a canonical JSON value. Identifies a configuration; not
// a security hash.
function fingerprint(value) {
  const canonical = (item) =>
    Array.isArray(item)
      ? `[${item.map(canonical).join(",")}]`
      : item && typeof item === "object"
      ? `{${Object.keys(item)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(item[key])}`)
          .join(",")}}`
      : JSON.stringify(item);
  const text = canonical(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function getPromptFingerprint(prompt) {
  return fingerprint({
    inputFormat: prompt.inputFormat,
    candidateLabels: prompt.candidateLabels,
    hypothesisTemplates: prompt.hypothesisTemplates,
  });
}

/*
 * What is known about a model's exact configuration (revision, dtype, prompt
 * profile and fingerprint, threshold fingerprint):
 * - APPROVED: evaluated, and developers recorded `approvedForAutoExclusion`
 *   for that evaluation. Only then may a confident identifier prediction of
 *   the model alone exclude a column automatically.
 * - EVALUATED: evaluated, not approved. Identifier predictions require
 *   review; confident non-identifier predictions stand.
 * - CONFIGURATION_CHANGED: evaluated, but not in this configuration.
 * - NOT_EVALUATED: every prediction requires review, because thresholds
 *   tuned for another model or prompt say nothing about these scores.
 */
export const AI_MODEL_VALIDATION_STATUS = Object.freeze({
  APPROVED: "approved",
  EVALUATED: "evaluated",
  CONFIGURATION_CHANGED: "configurationChanged",
  NOT_EVALUATED: "notEvaluated",
});

function getValidation(model, prompt) {
  const promptFingerprint = getPromptFingerprint(prompt);
  const thresholdsFingerprint = fingerprint(getModelThresholds(model));
  const validations = model.validations || [];
  const match = validations.find(
    (validation) =>
      validation.promptVersion === prompt.id &&
      validation.revision === model.revision &&
      validation.dtype === model.dtype &&
      validation.promptFingerprint === promptFingerprint &&
      validation.thresholdsFingerprint === thresholdsFingerprint
  );
  if (match) {
    return {
      status:
        match.approvedForAutoExclusion === true
          ? AI_MODEL_VALIDATION_STATUS.APPROVED
          : AI_MODEL_VALIDATION_STATUS.EVALUATED,
      validation: match,
    };
  }
  return {
    status: validations.length
      ? AI_MODEL_VALIDATION_STATUS.CONFIGURATION_CHANGED
      : AI_MODEL_VALIDATION_STATUS.NOT_EVALUATED,
    validation: null,
  };
}

export const AI_COLUMN_CLASSIFIER_MODELS = Object.freeze(
  modelRegistry.models.map((entry) => {
    const prompt = getPromptProfile(entry.promptProfile);
    if (!prompt) {
      throw new Error(`AI model ${entry.id}: unknown prompt profile ${entry.promptProfile}`);
    }
    const { status, validation } = getValidation(entry, prompt);
    const promptVersion = `${prompt.id}+${getPromptFingerprint(prompt)}`;
    return Object.freeze({
      ...entry,
      prompt,
      promptVersion,
      thresholds: getModelThresholds(entry),
      thresholdsVersion: `${entry.thresholdProfile}+${fingerprint(getModelThresholds(entry))}`,
      // Cache key component and the version recorded on every suggestion:
      // results of another model, revision, quantisation or prompt are never
      // reused. Thresholds only affect interpretation, which is not cached.
      version: `${entry.id}@${entry.revision.slice(0, 12)}/${entry.dtype}/${promptVersion}`,
      validationStatus: status,
      validation,
      configurationEvaluated:
        status === AI_MODEL_VALIDATION_STATUS.APPROVED ||
        status === AI_MODEL_VALIDATION_STATUS.EVALUATED,
      autoExclusionApproved: status === AI_MODEL_VALIDATION_STATUS.APPROVED,
    });
  })
);

const MODELS_BY_ID = new Map(AI_COLUMN_CLASSIFIER_MODELS.map((model) => [model.id, model]));

export const AI_DEFAULT_MODEL_ID = modelRegistry.defaultModelId;

/** Registry entry for `id`, or null for unknown ids. */
export function getColumnClassifierModel(id) {
  return MODELS_BY_ID.get(id) || null;
}

/** True when this build can run the model (enabled entry with a known strategy). */
export function isColumnClassifierModelSupported(model) {
  return (
    model?.availability === "enabled" &&
    Object.values(AI_CLASSIFICATION_STRATEGIES).includes(model.strategy)
  );
}

/**
 * Supported registry entry for `id`, or null. Another model is never
 * substituted for an unknown or unsupported id.
 */
export function resolveColumnClassifierModel(id) {
  const model = getColumnClassifierModel(id);
  return isColumnClassifierModelSupported(model) ? model : null;
}

export function getSelectableColumnClassifierModels() {
  return AI_COLUMN_CLASSIFIER_MODELS.filter(isColumnClassifierModelSupported);
}

/**
 * Base URL of an installed model's files on the backend. Files are requested
 * as `<base><revision>/<file>`: the revision is part of the path, so files of
 * another revision are never mixed in and responses can be cached.
 */
export function getModelFilesBaseUrl(model) {
  return `${apiUrl}/api/ai-models/${model.id}/files/`;
}

// ONNX Runtime WASM files, copied into the frontend build by
// scripts/copy-onnx-runtime.js (they must match the bundled onnxruntime-web).
export const AI_ORT_WASM_PATH = "/ai-assets/ort/";

// Error codes shared by the AI worker and its client.
export const AI_ERROR_CODES = Object.freeze({
  WORKER_UNAVAILABLE: "AI_WORKER_UNAVAILABLE",
  MODEL_LOAD_FAILED: "AI_MODEL_LOAD_FAILED",
  INFERENCE_FAILED: "AI_INFERENCE_FAILED",
  CANCELLED: "AI_CANCELLED",
  // No AI model is enabled, supported and installed for this deployment.
  NO_MODEL_AVAILABLE: "AI_NO_MODEL_AVAILABLE",
});
