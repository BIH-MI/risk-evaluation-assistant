import {
  CSV_PREVIEW_ROW_LIMIT,
  prepareParsedTable,
  profileTableFromSource,
} from "./qidProfiler";
import { parseCsvFile } from "./parsing/parseCsvFile";

// One shared worker multiplexes requests by requestId. Each uploaded table has
// its own sessionId inside that worker. Disposing a table removes its session,
// not the shared worker; refresh messages contain metadata and a handle only.
const REQUEST_INACTIVITY_MS = 120000;
const RECOVERY_GUIDANCE =
  "Remove affected uploaded tables and select their CSV files again. No partial profile can be saved.";
let qidWorker = null;
let qidWorkerUnavailable = false;
let workerGeneration = 0;
let nextRequestId = 0;
const pendingRequests = new Map();
const failureListeners = new Set();

/** Notify mounted forms when all sources owned by a failed worker become invalid. */
export function subscribeProfilingWorkerFailure(listener) {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

function failWorker(message) {
  const generation = workerGeneration;
  const error = new Error(`${message} ${RECOVERY_GUIDANCE}`);
  qidWorker?.terminate();
  qidWorker = null;
  pendingRequests.forEach((pending) => {
    clearTimeout(pending.timer);
    pending.reject(error);
  });
  pendingRequests.clear();
  failureListeners.forEach((listener) => listener({ generation, error }));
  // A new upload may create a fresh worker. Old handles cannot address its sources.
}

function armTimeout(pending) {
  clearTimeout(pending.timer);
  pending.timer = setTimeout(
    () => failWorker("CSV profiling stopped responding for two minutes."),
    REQUEST_INACTIVITY_MS
  );
}

function getQidWorker() {
  if (qidWorkerUnavailable || typeof Worker === "undefined") return null;
  if (qidWorker) return qidWorker;
  try {
    qidWorker = new Worker(new URL("../workers/qidWorker.js", import.meta.url));
    workerGeneration += 1;
  } catch (_error) {
    qidWorkerUnavailable = true;
    return null;
  }
  qidWorker.onmessage = ({ data }) => {
    const { requestId, type, ok, payload, error, progress } = data || {};
    const pending = pendingRequests.get(requestId);
    if (!pending) return;
    if (type === "PROGRESS") {
      armTimeout(pending);
      pending.onProgress?.(progress);
      return;
    }
    clearTimeout(pending.timer);
    pendingRequests.delete(requestId);
    if (ok) pending.resolve(payload);
    else
      pending.reject(
        new Error(
          error?.message ||
            "QID worker failed. Remove the table and select the CSV again."
        )
      );
  };
  qidWorker.onerror = (event) => {
    event?.preventDefault?.();
    failWorker("CSV profiling worker failed.");
  };
  qidWorker.onmessageerror = () =>
    failWorker("CSV profiling response could not be read.");
  return qidWorker;
}

function postQidWorkerMessage(type, payload, { onProgress } = {}) {
  const worker = getQidWorker();
  if (!worker)
    return Promise.reject(
      new Error(`QID worker is not available. ${RECOVERY_GUIDANCE}`)
    );
  const requestId = `qid:${nextRequestId++}`;
  return new Promise((resolve, reject) => {
    const pending = { resolve, reject, onProgress, timer: null };
    pendingRequests.set(requestId, pending);
    armTimeout(pending);
    try {
      worker.postMessage({ requestId, type, payload });
    } catch (_error) {
      clearTimeout(pending.timer);
      pendingRequests.delete(requestId);
      reject(
        new Error(
          `Could not send data to the profiling worker. ${RECOVERY_GUIDANCE}`
        )
      );
    }
  });
}

// Same response shape as the worker's PREPARE_TABLE handler; only the
// profiling session differs (the source stays on the main thread).
async function prepareTableSynchronously(
  file,
  qidDiscoveryConfiguration,
  onFields
) {
  const { rows, fields, parsingWarnings } = await parseCsvFile(file, {
    onFields,
  });
  const { profilingSource, columnMeta } = prepareParsedTable({ rows, fields });

  return {
    name: file.name,
    parsingWarnings,
    data: rows.slice(0, CSV_PREVIEW_ROW_LIMIT),
    columnMeta,
    subsetProfilingSummary: null,
    profilingSession: {
      type: "sync",
      source: profilingSource,
      qidDiscoveryConfiguration,
    },
  };
}

function requireProfilingConfiguration(qidDiscoveryConfiguration) {
  if (!qidDiscoveryConfiguration?.profiling) {
    throw new Error("QID Discovery Configuration must be selected.");
  }
}

/**
 * Prepares an uploaded CSV file for QID profiling: parses it, encodes each
 * observed source column, calculates individual attribute statistics and
 * evaluates Direct Identifier value-pattern evidence. Attribute subsets are
 * not profiled yet; the caller runs refreshUploadedTableProfile() once the
 * initial exclusions are resolved. `onFields` receives the CSV header names
 * as soon as they are parsed (header names only, never values). The worker
 * path keeps parsing and encoding off the React UI thread.
 *
 * If Worker support is unavailable, the same parser and pure profiling
 * functions run synchronously, so results and the privacy boundary (raw rows
 * never leave the browser) are identical.
 */
export async function prepareUploadedTable(
  file,
  { qidDiscoveryConfiguration, onFields }
) {
  requireProfilingConfiguration(qidDiscoveryConfiguration);

  if (getQidWorker()) {
    const generation = workerGeneration;
    const prepared = await postQidWorkerMessage(
      "PREPARE_TABLE",
      {
        file,
        qidDiscoveryConfiguration,
      },
      {
        onProgress: (progress) => {
          if (progress?.phase === "fields") onFields?.(progress.fields);
        },
      }
    );
    return {
      ...prepared,
      profilingSession: { ...prepared.profilingSession, generation },
    };
  }

  return prepareTableSynchronously(file, qidDiscoveryConfiguration, onFields);
}

/**
 * Profiles Distinguishability evidence from the existing profiling session:
 * once after preparation, with the initial exclusions applied, and again
 * after schema or exclusion changes, using the configuration the session was
 * prepared with. Encoded source columns and cached subset metrics are reused,
 * avoiding another CSV scan. This is browser-local computation: it does not
 * upload the CSV or make a backend request.
 */
export async function refreshUploadedTableProfile(
  profilingSession,
  columnMeta
) {
  const qidDiscoveryConfiguration = profilingSession?.qidDiscoveryConfiguration;

  requireProfilingConfiguration(qidDiscoveryConfiguration);

  if (profilingSession.type === "worker") {
    if (!qidWorker || profilingSession.generation !== workerGeneration) {
      throw new Error(
        `The profiling session is no longer available. ${RECOVERY_GUIDANCE}`
      );
    }
    return postQidWorkerMessage("REFRESH_TABLE_PROFILE", {
      sessionId: profilingSession.sessionId,
      columnMeta,
      profilingConfiguration: qidDiscoveryConfiguration.profiling,
    });
  }

  return profileTableFromSource(
    profilingSession.source,
    columnMeta,
    qidDiscoveryConfiguration.profiling
  );
}

/**
 * Invalidates a table profiling session. Worker sessions are actively
 * disposed; synchronous sessions become unreachable when React drops the table
 * object.
 */
export function disposeUploadedTableProfile(profilingSession) {
  if (
    !profilingSession ||
    profilingSession.type !== "worker" ||
    !qidWorker ||
    profilingSession.generation !== workerGeneration
  )
    return;

  postQidWorkerMessage("DISPOSE_PROFILING_SESSION", {
    sessionId: profilingSession.sessionId,
  }).catch(() => {});
}
