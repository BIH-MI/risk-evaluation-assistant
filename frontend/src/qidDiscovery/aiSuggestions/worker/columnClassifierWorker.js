/* eslint-env worker */
/* global globalThis */
import { env, pipeline } from "@huggingface/transformers";
import {
  AI_ASSET_MANIFEST,
  AI_ERROR_CODES,
  AI_COLUMN_CLASSIFIER_MODEL,
  AI_MODEL_PATH,
  AI_ORT_WASM_PATH,
} from "../modelConfig";
import {
  AI_CANDIDATE_LABELS,
  AI_HYPOTHESIS_TEMPLATES,
} from "../semanticCategories";

/*
 * Browser-local zero-shot column classifier. Runs only in this dedicated
 * worker so ONNX inference never blocks the React UI thread.
 *
 * Input is limited to normalized column-name text (plus an optional
 * researcher-written description). No CSV values reach this worker, and all
 * model, tokenizer and WASM files are loaded from the deployment's own
 * /ai-assets/ directory; remote model loading is disabled.
 */

let classifierPromise = null;
let configuredAssetBaseUrl = null;
const cancelledRequests = new Set();
// Requests (e.g. several uploaded tables classified automatically) are run one
// after another so a single ONNX session is never used concurrently.
let requestQueue = Promise.resolve();

function enqueue(task) {
  const result = requestQueue.then(task, task);
  requestQueue = result.catch(() => {});
  return result;
}

class ClassifierError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function configureLocalOnlyEnvironment(assetBaseUrl) {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = new URL(AI_MODEL_PATH, assetBaseUrl).href;
  // Files are served by our own Nginx with normal HTTP caching; the Cache API
  // copy would only duplicate ~100 MB per origin.
  env.useBrowserCache = false;

  const wasm = env.backends.onnx.wasm;
  wasm.wasmPaths = new URL(AI_ORT_WASM_PATH, assetBaseUrl).href;
  // Multi-threaded WASM needs cross-origin isolation (SharedArrayBuffer),
  // which REA does not enable; a single thread inside this worker is enough
  // for short column-name inputs.
  wasm.numThreads = 1;
  wasm.proxy = false;
}

/**
 * Reads the manifest written by scripts/fetch-ai-assets.js. A missing
 * manifest (or an SPA fallback returning index.html) means the assets were
 * not installed; a different revision means they do not match this build.
 */
async function verifyAssetManifest(assetBaseUrl) {
  let manifest;
  try {
    const response = await fetch(new URL(AI_ASSET_MANIFEST, assetBaseUrl), {
      cache: "no-cache",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    manifest = await response.json();
  } catch (error) {
    throw new ClassifierError(
      AI_ERROR_CODES.ASSETS_UNAVAILABLE,
      `AI model assets are not installed (${error.message}).`
    );
  }

  if (
    manifest?.modelId !== AI_COLUMN_CLASSIFIER_MODEL.modelId ||
    manifest?.revision !== AI_COLUMN_CLASSIFIER_MODEL.revision ||
    manifest?.dtype !== AI_COLUMN_CLASSIFIER_MODEL.dtype
  ) {
    throw new ClassifierError(
      AI_ERROR_CODES.ASSETS_UNAVAILABLE,
      "Installed AI model assets do not match the pinned model revision."
    );
  }
}

function createLoadProgressReporter(requestId) {
  const files = new Map();

  return (event) => {
    if (!event?.file) return;
    if (event.status === "progress" || event.status === "done") {
      const previous = files.get(event.file) || { loaded: 0, total: 0 };
      const total = event.total || previous.total;
      files.set(event.file, {
        total,
        loaded: event.status === "done" ? total : event.loaded || 0,
      });
    } else if (event.status === "initiate" && !files.has(event.file)) {
      files.set(event.file, { loaded: 0, total: 0 });
    } else {
      return;
    }

    let loaded = 0;
    let total = 0;
    files.forEach((file) => {
      loaded += file.loaded;
      total += file.total;
    });

    globalThis.postMessage({
      requestId,
      type: "PROGRESS",
      progress: {
        phase: "loading-model",
        loadedBytes: loaded,
        totalBytes: total,
      },
    });
  };
}

/**
 * Loads the pipeline once per worker and reuses it for every request. A
 * failed load is forgotten so the researcher can retry.
 */
function getClassifier(assetBaseUrl, requestId) {
  if (classifierPromise && configuredAssetBaseUrl === assetBaseUrl) {
    return classifierPromise;
  }

  configuredAssetBaseUrl = assetBaseUrl;
  classifierPromise = (async () => {
    await verifyAssetManifest(assetBaseUrl);
    configureLocalOnlyEnvironment(assetBaseUrl);

    try {
      return await pipeline(
        AI_COLUMN_CLASSIFIER_MODEL.task,
        AI_COLUMN_CLASSIFIER_MODEL.modelId,
        {
          device: AI_COLUMN_CLASSIFIER_MODEL.device,
          dtype: AI_COLUMN_CLASSIFIER_MODEL.dtype,
          local_files_only: true,
          progress_callback: createLoadProgressReporter(requestId),
        }
      );
    } catch (error) {
      throw new ClassifierError(
        AI_ERROR_CODES.MODEL_LOAD_FAILED,
        error?.message || String(error)
      );
    }
  })();

  classifierPromise.catch(() => {
    classifierPromise = null;
    configuredAssetBaseUrl = null;
  });

  return classifierPromise;
}

function throwIfCancelled(requestId) {
  if (cancelledRequests.has(requestId)) {
    throw new ClassifierError(AI_ERROR_CODES.CANCELLED, "Cancelled.");
  }
}

async function classifyColumns(requestId, { assetBaseUrl, inputs = [] }) {
  const classifier = await getClassifier(assetBaseUrl, requestId);
  const results = [];

  for (let index = 0; index < inputs.length; index += 1) {
    throwIfCancelled(requestId);
    globalThis.postMessage({
      requestId,
      type: "PROGRESS",
      progress: {
        phase: "classifying",
        completed: index,
        total: inputs.length,
      },
    });

    const { key, text } = inputs[index];
    // Average each label's score over the hypothesis templates.
    const averagedScores = new Map(AI_CANDIDATE_LABELS.map((label) => [label, 0]));
    try {
      for (const template of AI_HYPOTHESIS_TEMPLATES) {
        const output = await classifier(text, AI_CANDIDATE_LABELS, {
          hypothesis_template: template,
          multi_label: false,
        });
        output.labels.forEach((label, labelIndex) => {
          averagedScores.set(
            label,
            averagedScores.get(label) +
              output.scores[labelIndex] / AI_HYPOTHESIS_TEMPLATES.length
          );
        });
      }
    } catch (error) {
      throw new ClassifierError(
        AI_ERROR_CODES.INFERENCE_FAILED,
        error?.message || String(error)
      );
    }

    const ranked = Array.from(averagedScores.entries()).sort(
      (left, right) => right[1] - left[1]
    );
    results.push({
      key,
      labels: ranked.map(([label]) => label),
      scores: ranked.map(([, score]) => score),
    });
  }

  throwIfCancelled(requestId);
  return { results };
}

globalThis.onmessage = async ({ data }) => {
  const { requestId, type, payload } = data || {};

  if (type === "CANCEL") {
    cancelledRequests.add(payload?.requestId);
    return;
  }

  try {
    let response;
    if (type === "PRELOAD_MODEL") {
      // Starts loading the shared pipeline (e.g. while a CSV is still being
      // parsed); the next CLASSIFY_COLUMNS request awaits the same promise.
      const startedAt = performance.now();
      await getClassifier(payload?.assetBaseUrl, requestId);
      response = { loaded: true, waitedMs: performance.now() - startedAt };
    } else if (type === "CLASSIFY_COLUMNS") {
      const startedAt = performance.now();
      response = await enqueue(() => classifyColumns(requestId, payload));
      response.timings = { requestMs: performance.now() - startedAt };
    } else {
      throw new Error(`Unsupported AI worker message: ${type}`);
    }

    globalThis.postMessage({ requestId, ok: true, payload: response });
  } catch (error) {
    globalThis.postMessage({
      requestId,
      ok: false,
      error: {
        code: error?.code || AI_ERROR_CODES.INFERENCE_FAILED,
        message: error?.message || String(error),
      },
    });
  } finally {
    cancelledRequests.delete(requestId);
  }
};
