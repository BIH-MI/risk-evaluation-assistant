import {
  CSV_PREVIEW_ROW_LIMIT,
  prepareParsedTable,
  profileTableFromSource,
} from "./qidProfiler";
import { parseCsvFile } from "./parsing/parseCsvFile";

let qidWorker = null;
let qidWorkerUnavailable = false;
let nextRequestId = 0;
const pendingRequests = new Map();

function getQidWorker() {
  if (qidWorkerUnavailable || typeof Worker === "undefined") return null;
  if (qidWorker) return qidWorker;

  try {
    qidWorker = new Worker(new URL("./worker/qidWorker.js", import.meta.url));
  } catch (_err) {
    qidWorkerUnavailable = true;
    return null;
  }

  qidWorker.onmessage = ({ data }) => {
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
      pending.reject(new Error(error?.message || "QID worker failed."));
    }
  };

  qidWorker.onerror = (error) => {
    pendingRequests.forEach(({ reject }) => {
      reject(new Error(error?.message || "QID worker failed."));
    });
    pendingRequests.clear();
    qidWorker.terminate();
    qidWorker = null;
    qidWorkerUnavailable = true;
  };

  return qidWorker;
}

function postQidWorkerMessage(type, payload, { onProgress } = {}) {
  const worker = getQidWorker();
  if (!worker) {
    return Promise.reject(new Error("QID worker is not available."));
  }

  const requestId = `qid:${nextRequestId}`;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, {
      resolve,
      reject,
      onProgress,
    });
    worker.postMessage({
      requestId,
      type,
      payload,
    });
  });
}

// Same response shape as the worker's PREPARE_TABLE handler; only the
// profiling session differs (the source stays on the main thread).
async function prepareTableSynchronously(
  file,
  qidDiscoveryConfiguration,
  onFields
) {
  const { rows, fields } = await parseCsvFile(file, { onFields });
  const { profilingSource, columnMeta } = prepareParsedTable({ rows, fields });

  return {
    name: file.name,
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
    return postQidWorkerMessage(
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
  }

  return prepareTableSynchronously(file, qidDiscoveryConfiguration, onFields);
}

/**
 * Profiles Distinguishability evidence from the existing profiling session:
 * once after preparation, with the initial exclusions applied, and again
 * after schema or exclusion changes, using the configuration the session was
 * prepared with. Encoded source columns and cached subset metrics are reused,
 * avoiding another CSV scan.
 */
export async function refreshUploadedTableProfile(
  profilingSession,
  columnMeta
) {
  const qidDiscoveryConfiguration = profilingSession?.qidDiscoveryConfiguration;

  requireProfilingConfiguration(qidDiscoveryConfiguration);

  if (profilingSession.type === "worker") {
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
  if (!profilingSession || profilingSession.type !== "worker") return;

  postQidWorkerMessage("DISPOSE_PROFILING_SESSION", {
    sessionId: profilingSession.sessionId,
  }).catch(() => {});
}
