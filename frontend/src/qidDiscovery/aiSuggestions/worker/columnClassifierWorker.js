/* eslint-env worker */
/* global globalThis */
import { env, pipeline } from "@huggingface/transformers";
import {
  AI_CLASSIFICATION_STRATEGIES,
  AI_ERROR_CODES,
  isColumnClassifierModelSupported,
  getColumnClassifierModel,
} from "../modelConfig";
import { zeroShotNliAdapter } from "./zeroShotNliAdapter";

/*
 * Browser-local zero-shot column classifier. Runs only in this dedicated
 * worker so ONNX inference never blocks the React UI thread.
 *
 * Input is limited to normalized column-name text (plus an optional
 * researcher-written description). No CSV values reach this worker. Model
 * and tokenizer files are loaded from REA's backend (verified at
 * installation) and the WASM runtime from the frontend's own origin; loading
 * from Hugging Face or any other remote host is disabled.
 *
 * Every request names a model from the registry (modelConfig.js). Requests,
 * including preloads, run one after another in a single queue, and only one
 * model is kept in memory: a request for another model disposes the previous
 * pipeline (no queued request can still be using it) before loading the new
 * one, so two models are never resident at the same time.
 */

const ADAPTERS = Object.freeze({
  [AI_CLASSIFICATION_STRATEGIES.ZERO_SHOT_NLI]: zeroShotNliAdapter,
});

// The loaded pipeline: { key, promise }. `key` identifies model version + URL.
// Only read and replaced by queued tasks.
let loadedClassifier = null;
// Requests received and not yet answered; CANCEL is recorded only for these,
// so a late cancellation of a finished request is not kept forever.
const activeRequests = new Set();
const cancelledRequests = new Set();
// Requests (e.g. several uploaded tables classified automatically) are run one
// after another so a single ONNX session is never used concurrently and
// models are never loaded in parallel.
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

function configureLocalOnlyEnvironment(modelUrl, ortWasmUrl) {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  // Global, but safe: models are loaded one at a time by the request queue.
  env.localModelPath = modelUrl;
  // The backend serves model files with long-lived HTTP caching; the Cache
  // API copy would only duplicate them per origin.
  env.useBrowserCache = false;

  const wasm = env.backends.onnx.wasm;
  wasm.wasmPaths = ortWasmUrl;
  // Multi-threaded WASM needs cross-origin isolation (SharedArrayBuffer,
  // COOP/COEP headers). Without it, use a single thread inside this worker.
  wasm.numThreads = globalThis.crossOriginIsolated
    ? Math.min(4, globalThis.navigator?.hardwareConcurrency || 1)
    : 1;
  wasm.proxy = false;
}

/**
 * Model loading progress. Transformers.js reports each file separately and
 * only learns a file's size when that file starts, so a sum over files would
 * jump backwards. Byte counts are therefore reported only for the ONNX
 * weights (nearly all of the download) once their size is known; the
 * configuration and tokenizer files are reported without bytes, which the
 * UI shows as indeterminate progress.
 */
function createLoadProgressReporter(requestId) {
  const post = (progress) =>
    globalThis.postMessage({ requestId, type: "PROGRESS", progress });

  return (event) => {
    if (!event?.file) return;
    const isWeights = /\.onnx$/i.test(event.file);
    if (
      isWeights &&
      (event.status === "progress" || event.status === "done") &&
      event.total > 0
    ) {
      post({
        phase: "loading-model",
        loadedBytes: event.status === "done" ? event.total : event.loaded || 0,
        totalBytes: event.total,
      });
    } else if (event.status === "initiate") {
      post({ phase: "loading-model" });
    }
  };
}

/** Supported registry entry and its adapter, or a MODEL_LOAD_FAILED error. */
function resolveModel(modelId) {
  const model = getColumnClassifierModel(modelId);
  const adapter = model && ADAPTERS[model.strategy];
  if (!isColumnClassifierModelSupported(model) || !adapter || adapter.task !== model.task) {
    throw new ClassifierError(
      AI_ERROR_CODES.MODEL_LOAD_FAILED,
      `Unsupported AI model: ${modelId}`
    );
  }
  return { model, adapter };
}

async function disposePipeline(promise) {
  try {
    const classifier = await promise;
    await classifier?.dispose?.();
  } catch (_error) {
    // A failed load has nothing to release.
  }
}

/**
 * Loads the model's pipeline once and reuses it while the same model is
 * requested. A failed load is forgotten so the researcher can retry. Must
 * only be called from a queued task: the previous model is then no longer in
 * use and is released before the new one is loaded.
 */
async function getClassifier({ modelUrl, ortWasmUrl }, model, requestId) {
  const key = `${model.version}|${modelUrl}`;
  if (loadedClassifier?.key === key) {
    return loadedClassifier.promise;
  }

  if (loadedClassifier) {
    const previous = loadedClassifier.promise;
    loadedClassifier = null;
    await disposePipeline(previous);
  }

  const promise = (async () => {
    configureLocalOnlyEnvironment(modelUrl, ortWasmUrl);
    try {
      // Resolved against localModelPath: <modelUrl><revision>/<file>.
      return await pipeline(model.task, model.revision, {
        device: model.device,
        dtype: model.dtype,
        local_files_only: true,
        progress_callback: createLoadProgressReporter(requestId),
      });
    } catch (error) {
      throw new ClassifierError(
        AI_ERROR_CODES.MODEL_LOAD_FAILED,
        error?.message || String(error)
      );
    }
  })();
  loadedClassifier = { key, promise };

  promise.catch(() => {
    if (loadedClassifier?.promise === promise) loadedClassifier = null;
  });

  return promise;
}

function throwIfCancelled(requestId) {
  if (cancelledRequests.has(requestId)) {
    throw new ClassifierError(AI_ERROR_CODES.CANCELLED, "Cancelled.");
  }
}

async function classifyColumns(
  requestId,
  { modelUrl, ortWasmUrl, modelId, inputs = [], candidateLabels = [], hypothesisTemplates = [] }
) {
  const { model, adapter } = resolveModel(modelId);
  // Cancelled while queued: do not load a model for it.
  throwIfCancelled(requestId);
  const classifier = await getClassifier({ modelUrl, ortWasmUrl }, model, requestId);
  const results = [];
  const postProgress = (completed) =>
    globalThis.postMessage({
      requestId,
      type: "PROGRESS",
      progress: { phase: "classifying", completed, total: inputs.length },
    });

  // Model ready: 0 of n. Then one event after each classified input, so the
  // last event reports n of n.
  throwIfCancelled(requestId);
  postProgress(0);
  for (let index = 0; index < inputs.length; index += 1) {
    throwIfCancelled(requestId);
    const { key, text } = inputs[index];
    let output;
    try {
      output = await adapter.classify(classifier, {
        text,
        candidateLabels,
        hypothesisTemplates,
      });
    } catch (error) {
      throw new ClassifierError(
        AI_ERROR_CODES.INFERENCE_FAILED,
        error?.message || String(error)
      );
    }

    // Every candidate label must be scored exactly once; anything else would
    // be misread as a different category.
    if (
      output?.labels?.length !== candidateLabels.length ||
      output.scores?.length !== candidateLabels.length ||
      new Set(output.labels).size !== candidateLabels.length ||
      !output.labels.every((label) => candidateLabels.includes(label))
    ) {
      throw new ClassifierError(
        AI_ERROR_CODES.INFERENCE_FAILED,
        "AI model returned an unexpected label set."
      );
    }
    results.push({ key, labels: output.labels, scores: output.scores });
    postProgress(index + 1);
  }

  throwIfCancelled(requestId);
  return { results, modelId: model.id };
}

globalThis.onmessage = async ({ data }) => {
  const { requestId, type, payload } = data || {};

  if (type === "CANCEL") {
    if (activeRequests.has(payload?.requestId)) {
      cancelledRequests.add(payload.requestId);
    }
    return;
  }

  activeRequests.add(requestId);
  try {
    let response;
    if (type === "PRELOAD_MODEL") {
      // Loads the model (e.g. while a CSV is still being parsed) so the next
      // CLASSIFY_COLUMNS request finds it ready. Queued like a request, so it
      // never loads a second model while another one is in use.
      const startedAt = performance.now();
      const { model } = resolveModel(payload?.modelId);
      response = await enqueue(async () => {
        const alreadyLoaded =
          loadedClassifier?.key === `${model.version}|${payload?.modelUrl}`;
        await getClassifier(payload, model, requestId);
        return { loaded: true, alreadyLoaded };
      });
      response.waitedMs = performance.now() - startedAt;
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
    activeRequests.delete(requestId);
    cancelledRequests.delete(requestId);
  }
};
