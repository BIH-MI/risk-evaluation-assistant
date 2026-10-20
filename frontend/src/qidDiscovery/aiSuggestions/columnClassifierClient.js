import {
  buildColumnClassificationInput,
  formatColumnPremise,
} from "./columnNameText";
import {
  buildUnavailableColumnSuggestion,
  interpretColumnClassification,
} from "./columnSuggestions";
import {
  AI_ERROR_CODES,
  AI_ORT_WASM_PATH,
  getModelFilesBaseUrl,
  resolveColumnClassifierModel,
} from "./modelConfig";

/*
 * Main-thread wrapper around the AI column classifier worker.
 *
 * - The worker (and with it @huggingface/transformers and ONNX Runtime) is
 *   created lazily on the first classification request, and the loaded model
 *   is reused by every later request for the same model in this browser tab.
 * - Every request names its model (registry id, see modelConfig.js) and the
 *   URL of its installed files on REA's backend; the candidate labels and
 *   hypothesis templates of the model's prompt profile are passed with it,
 *   and inputs are formatted in the profile's premise format, so the worker
 *   holds no application-specific prompt.
 * - Classification results are cached per session object, keyed by model
 *   version and normalized input. Each Add Dataset form creates its own
 *   session and disposes it on unmount, so classification histories are
 *   never shared between datasets.
 * - A worker that sends nothing for WORKER_INACTIVITY_TIMEOUT_MS while
 *   requests are pending (e.g. a stalled model download) is terminated and
 *   its requests fail with AI_ERROR_CODES.TIMEOUT, so screening reports what
 *   was not screened instead of running forever.
 */

// Model download progress and per-column results arrive far more often.
const WORKER_INACTIVITY_TIMEOUT_MS = 120000;

let classifierWorker = null;
let nextRequestId = 0;
const pendingRequests = new Map();
let lastWorkerActivity = 0;
let watchdogTimer = null;

export class ColumnClassifierError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function rejectAllPending(error) {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests.clear();
}

// Drops the worker (and the model loaded in it); the next request starts a
// fresh one.
function failWorker(error) {
  rejectAllPending(error);
  classifierWorker?.terminate();
  classifierWorker = null;
}

function markWorkerActive() {
  lastWorkerActivity = Date.now();
  if (watchdogTimer) return;
  watchdogTimer = setInterval(() => {
    if (!pendingRequests.size) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    } else if (Date.now() - lastWorkerActivity > WORKER_INACTIVITY_TIMEOUT_MS) {
      failWorker(
        new ColumnClassifierError(AI_ERROR_CODES.TIMEOUT, "AI screening timed out.")
      );
    }
  }, 5000);
}

function getClassifierWorker() {
  if (classifierWorker) return classifierWorker;
  if (typeof Worker === "undefined") {
    throw new ColumnClassifierError(
      AI_ERROR_CODES.WORKER_UNAVAILABLE,
      "Web Workers are not available in this browser."
    );
  }

  try {
    classifierWorker = new Worker(
      new URL("./worker/columnClassifierWorker.js", import.meta.url)
    );
  } catch (error) {
    throw new ColumnClassifierError(
      AI_ERROR_CODES.WORKER_UNAVAILABLE,
      error?.message || "AI worker could not be started."
    );
  }

  classifierWorker.onmessage = ({ data }) => {
    markWorkerActive();
    const { requestId, type, ok, payload, error, progress } = data || {};
    const pending = pendingRequests.get(requestId);
    if (!pending) return;

    if (type === "PROGRESS") {
      pending.onProgress?.(progress);
      return;
    }

    pendingRequests.delete(requestId);
    if (ok) {
      pending.resolve(payload);
    } else {
      pending.reject(
        new ColumnClassifierError(
          error?.code || AI_ERROR_CODES.INFERENCE_FAILED,
          error?.message || "AI classification failed."
        )
      );
    }
  };

  // A crashed worker (e.g. out of memory while loading the model).
  classifierWorker.onerror = (event) => {
    event?.preventDefault?.();
    failWorker(
      new ColumnClassifierError(
        AI_ERROR_CODES.MODEL_LOAD_FAILED,
        event?.message || "AI worker failed."
      )
    );
  };

  return classifierWorker;
}

// Locations passed to the worker, which has no access to the page's URL
// configuration.
function getModelLocations(model) {
  const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return {
    modelUrl: getModelFilesBaseUrl(model),
    ortWasmUrl: new URL(`${publicUrl}${AI_ORT_WASM_PATH}`, window.location.href).href,
  };
}

function postClassifyRequest(inputs, { model, onProgress, signal }) {
  const worker = getClassifierWorker();
  const requestId = `ai:${nextRequestId}`;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    const abort = () => {
      if (!pendingRequests.has(requestId)) return;
      pendingRequests.delete(requestId);
      worker.postMessage({ type: "CANCEL", payload: { requestId } });
      reject(new ColumnClassifierError(AI_ERROR_CODES.CANCELLED, "Cancelled."));
    };

    if (signal?.aborted) {
      reject(new ColumnClassifierError(AI_ERROR_CODES.CANCELLED, "Cancelled."));
      return;
    }

    pendingRequests.set(requestId, {
      resolve: (value) => {
        signal?.removeEventListener("abort", abort);
        resolve(value);
      },
      reject: (error) => {
        signal?.removeEventListener("abort", abort);
        reject(error);
      },
      onProgress,
    });
    signal?.addEventListener("abort", abort, { once: true });

    markWorkerActive();
    worker.postMessage({
      requestId,
      type: "CLASSIFY_COLUMNS",
      payload: {
        ...getModelLocations(model),
        modelId: model.id,
        inputs,
        candidateLabels: model.prompt.candidateLabels,
        hypothesisTemplates: model.prompt.hypothesisTemplates,
      },
    });
  });
}

/**
 * Starts loading the shared AI worker and model without classifying anything,
 * so model loading can overlap CSV parsing. Never sends column names or
 * values. Failures are ignored here: the next classification request retries
 * the load and reports the error through its suggestions.
 *
 * @param {string} modelId Registry id.
 * @returns {Promise<{ loaded: boolean, waitedMs?: number }>}
 */
export function preloadColumnClassifier(modelId) {
  const model = resolveColumnClassifierModel(modelId);
  if (!model) return Promise.resolve({ loaded: false });
  let worker;
  try {
    worker = getClassifierWorker();
  } catch (_error) {
    return Promise.resolve({ loaded: false });
  }

  const requestId = `ai:${nextRequestId}`;
  nextRequestId += 1;

  return new Promise((resolve) => {
    pendingRequests.set(requestId, {
      resolve: (payload) => resolve(payload),
      reject: () => resolve({ loaded: false }),
    });
    markWorkerActive();
    worker.postMessage({
      requestId,
      type: "PRELOAD_MODEL",
      payload: {
        ...getModelLocations(model),
        modelId: model.id,
      },
    });
  });
}

export function isCancelledClassification(error) {
  return error?.code === AI_ERROR_CODES.CANCELLED;
}

/**
 * Creates an isolated classification session with its own result cache.
 *
 * @returns {{
 *   classifyColumns: (columns: Array<{columnKey: string, columnName: string, description?: string}>,
 *     options?: { modelId?: string|null, onProgress?: Function, signal?: AbortSignal }) => Promise<Object[]>,
 *   buildUnavailableSuggestions: (columns: Array, error: Error) => Object[],
 *   dispose: () => void,
 * }}
 */
export function createColumnClassifierSession() {
  const cache = new Map();
  // Model version (repository, revision, dtype, prompt profile) first:
  // results of different models or prompts are never mixed.
  const cacheKeyFor = (model, input) => `${model.version}|${input.cacheKey}`;

  async function classifyColumns(columns = [], options = {}) {
    // null: no model is available (see resolveAiScreeningModels).
    if (options.modelId === null) {
      throw new ColumnClassifierError(
        AI_ERROR_CODES.NO_MODEL_AVAILABLE,
        "No AI model is available."
      );
    }
    const model = resolveColumnClassifierModel(options.modelId);
    // An explicitly requested model that this build cannot run is reported
    // as unavailable; no other model is used in its place.
    if (!model) {
      throw new ColumnClassifierError(
        AI_ERROR_CODES.NO_MODEL_AVAILABLE,
        `AI model is not supported: ${options.modelId}`
      );
    }
    const prepared = columns.map((column) => ({
      columnKey: column.columnKey,
      input: buildColumnClassificationInput(column),
    }));

    const uncachedInputs = new Map();
    // Columns per uncached input (equal names share one inference).
    const columnsPerInput = new Map();
    prepared.forEach(({ input }) => {
      const key = cacheKeyFor(model, input);
      if (cache.has(key)) return;
      if (!uncachedInputs.has(key)) {
        uncachedInputs.set(key, {
          key,
          text: formatColumnPremise(input, model.prompt.inputFormat),
        });
      }
      columnsPerInput.set(key, (columnsPerInput.get(key) || 0) + 1);
    });

    options.onCacheStats?.({ total: prepared.length, uncached: uncachedInputs.size });

    // Progress counts columns: cached ones are complete from the start, and
    // the worker's per-input counts are converted to columns.
    const total = prepared.length;
    const cachedColumns =
      total - Array.from(columnsPerInput.values()).reduce((sum, count) => sum + count, 0);
    const inputOrder = Array.from(uncachedInputs.keys());
    const completedColumnsAfter = [cachedColumns];
    inputOrder.forEach((key, index) => {
      completedColumnsAfter.push(completedColumnsAfter[index] + columnsPerInput.get(key));
    });
    const reportProgress = (progress) => {
      if (progress?.phase !== "classifying") {
        options.onProgress?.(progress);
        return;
      }
      const completedInputs = Math.min(
        Math.max(Number(progress.completed) || 0, 0),
        inputOrder.length
      );
      options.onProgress?.({
        phase: "classifying",
        completed: completedColumnsAfter[completedInputs],
        total,
      });
    };

    if (uncachedInputs.size === 0) {
      reportProgress({ phase: "classifying", completed: 0 });
    } else {
      const { results, modelId } = await postClassifyRequest(
        Array.from(uncachedInputs.values()),
        { ...options, onProgress: reportProgress, model }
      );
      if (modelId !== model.id) {
        throw new ColumnClassifierError(
          AI_ERROR_CODES.INFERENCE_FAILED,
          "AI worker answered with a different model."
        );
      }
      results.forEach(({ key, labels, scores }) => {
        cache.set(key, { labels, scores });
      });
    }

    return prepared.map(({ columnKey, input }) =>
      interpretColumnClassification({
        columnKey,
        input,
        output: cache.get(cacheKeyFor(model, input)),
        modelId: model.id,
      })
    );
  }

  function buildUnavailableSuggestions(columns = [], error, { modelId } = {}) {
    return columns.map((column) =>
      buildUnavailableColumnSuggestion({
        columnKey: column.columnKey,
        input: buildColumnClassificationInput(column),
        error: error
          ? { code: error.code || null, message: error.message || "" }
          : null,
        modelId,
      })
    );
  }

  return {
    classifyColumns,
    buildUnavailableSuggestions,
    dispose() {
      cache.clear();
    },
  };
}
