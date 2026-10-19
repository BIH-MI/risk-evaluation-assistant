import { buildColumnClassificationInput } from "./columnNameText";
import {
  buildUnavailableColumnSuggestion,
  interpretColumnClassification,
} from "./columnSuggestions";
import {
  AI_ASSET_BASE_PATH,
  AI_COLUMN_CLASSIFIER_VERSION,
  AI_ERROR_CODES,
} from "./modelConfig";

/*
 * Main-thread wrapper around the AI column classifier worker.
 *
 * - The worker (and with it @huggingface/transformers and ONNX Runtime) is
 *   created lazily on the first classification request, and the loaded model
 *   is reused by every later request in this browser tab.
 * - Classification results are cached per session object, keyed by model
 *   version and normalized input. Each Add Dataset form creates its own
 *   session and disposes it on unmount, so classification histories are
 *   never shared between datasets.
 */

let classifierWorker = null;
let nextRequestId = 0;
const pendingRequests = new Map();

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

  // A crashed worker (e.g. out of memory while loading the model) is dropped
  // so the next request starts a fresh one.
  classifierWorker.onerror = (event) => {
    event?.preventDefault?.();
    rejectAllPending(
      new ColumnClassifierError(
        AI_ERROR_CODES.MODEL_LOAD_FAILED,
        event?.message || "AI worker failed."
      )
    );
    classifierWorker?.terminate();
    classifierWorker = null;
  };

  return classifierWorker;
}

function getAssetBaseUrl() {
  const publicUrl = process.env.PUBLIC_URL || "";
  return new URL(
    `${publicUrl.replace(/\/$/, "")}${AI_ASSET_BASE_PATH}`,
    window.location.href
  ).href;
}

function postClassifyRequest(inputs, { onProgress, signal }) {
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

    worker.postMessage({
      requestId,
      type: "CLASSIFY_COLUMNS",
      payload: {
        assetBaseUrl: getAssetBaseUrl(),
        inputs,
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
 * @returns {Promise<{ loaded: boolean, waitedMs?: number }>}
 */
export function preloadColumnClassifier() {
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
    worker.postMessage({
      requestId,
      type: "PRELOAD_MODEL",
      payload: { assetBaseUrl: getAssetBaseUrl() },
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
 *     options?: { onProgress?: Function, signal?: AbortSignal }) => Promise<Object[]>,
 *   buildUnavailableSuggestions: (columns: Array, error: Error) => Object[],
 *   dispose: () => void,
 * }}
 */
export function createColumnClassifierSession() {
  const cache = new Map();
  const cacheKeyFor = (input) =>
    `${AI_COLUMN_CLASSIFIER_VERSION}|${input.cacheKey}`;

  async function classifyColumns(columns = [], options = {}) {
    const prepared = columns.map((column) => ({
      columnKey: column.columnKey,
      input: buildColumnClassificationInput(column),
    }));

    const uncachedInputs = new Map();
    prepared.forEach(({ input }) => {
      const key = cacheKeyFor(input);
      if (!cache.has(key) && !uncachedInputs.has(key)) {
        uncachedInputs.set(key, { key, text: input.text });
      }
    });

    if (uncachedInputs.size > 0) {
      const { results } = await postClassifyRequest(
        Array.from(uncachedInputs.values()),
        options
      );
      results.forEach(({ key, labels, scores }) => {
        cache.set(key, { labels, scores });
      });
    }

    return prepared.map(({ columnKey, input }) =>
      interpretColumnClassification({
        columnKey,
        input,
        output: cache.get(cacheKeyFor(input)),
      })
    );
  }

  function buildUnavailableSuggestions(columns = [], error) {
    return columns.map((column) =>
      buildUnavailableColumnSuggestion({
        columnKey: column.columnKey,
        input: buildColumnClassificationInput(column),
        error: error
          ? { code: error.code || null, message: error.message || "" }
          : null,
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
