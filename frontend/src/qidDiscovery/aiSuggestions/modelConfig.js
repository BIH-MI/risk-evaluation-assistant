// Pinned identity of the browser-local column classifier. The revision, dtype
// and asset hashes are kept in sync with scripts/fetch-ai-assets.js, which
// self-hosts exactly these files under public/ai-assets/.
export const AI_COLUMN_CLASSIFIER_MODEL = Object.freeze({
  task: "zero-shot-classification",
  modelId: "Xenova/nli-deberta-v3-xsmall",
  revision: "2a4f614a701367a02d51389039afc998faeda637",
  dtype: "q8",
  device: "wasm",
  runtime: "@huggingface/transformers@3.8.1",
});

// Cache key component and the version recorded on every suggestion. Any change
// to the model, revision, dtype, prompt or candidate labels must change it so
// cached suggestions from a different configuration are never reused.
export const AI_PROMPT_VERSION = "column-zero-shot-v2";

export const AI_COLUMN_CLASSIFIER_VERSION = `${AI_COLUMN_CLASSIFIER_MODEL.modelId}@${AI_COLUMN_CLASSIFIER_MODEL.revision.slice(
  0,
  12
)}/${AI_COLUMN_CLASSIFIER_MODEL.dtype}/${AI_PROMPT_VERSION}`;

// Asset locations below the deployment's PUBLIC_URL. Workers resolve these
// against the page origin passed in by the client.
export const AI_ASSET_BASE_PATH = "/ai-assets/";
export const AI_ASSET_MANIFEST = "manifest.json";
export const AI_MODEL_PATH = "models/";
export const AI_ORT_WASM_PATH = "ort/";

// Error codes shared by the AI worker and its client.
export const AI_ERROR_CODES = Object.freeze({
  WORKER_UNAVAILABLE: "AI_WORKER_UNAVAILABLE",
  ASSETS_UNAVAILABLE: "AI_ASSETS_UNAVAILABLE",
  MODEL_LOAD_FAILED: "AI_MODEL_LOAD_FAILED",
  INFERENCE_FAILED: "AI_INFERENCE_FAILED",
  CANCELLED: "AI_CANCELLED",
});
