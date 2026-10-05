import {
  CSV_PREVIEW_ROW_LIMIT,
  profileParsedTable,
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
    const { requestId, ok, payload, error } = data || {};
    const pending = pendingRequests.get(requestId);
    if (!pending) return;

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

function postQidWorkerMessage(type, payload) {
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
    });
    worker.postMessage({
      requestId,
      type,
      payload,
    });
  });
}

// Same response shape as the worker's PROFILE_TABLE handler; only the
// profiling session differs (the source stays on the main thread).
async function profileTableSynchronously(file, qidDiscoveryConfiguration) {
  const { rows, fields } = await parseCsvFile(file);
  const profile = profileParsedTable(
    { rows, fields },
    qidDiscoveryConfiguration.profiling
  );

  return {
    name: file.name,
    data: rows.slice(0, CSV_PREVIEW_ROW_LIMIT),
    columnMeta: profile.columnMeta,
    subsetProfilingSummary: profile.subsetProfilingSummary,
    profilingSession: {
      type: "sync",
      source: profile.profilingSource,
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
 * Profiles an uploaded CSV file, encodes each observed source column, evaluates
 * Direct Identifier evidence, and calculates initial Distinguishability
 * evidence. The worker path keeps large CSV parsing and subset profiling work
 * off the React UI thread.
 *
 * If Worker support is unavailable, the same parser and pure profiling
 * functions run synchronously, so results and the privacy boundary (raw rows
 * never leave the browser) are identical.
 */
export async function profileUploadedTable(
  file,
  { qidDiscoveryConfiguration }
) {
  requireProfilingConfiguration(qidDiscoveryConfiguration);

  if (getQidWorker()) {
    return postQidWorkerMessage("PROFILE_TABLE", {
      file,
      qidDiscoveryConfiguration,
    });
  }

  return profileTableSynchronously(file, qidDiscoveryConfiguration);
}

/**
 * Refreshes Distinguishability evidence from the existing profiling session
 * after schema or exclusion changes, using the configuration the session was
 * profiled with. Encoded source columns and cached subset metrics are reused,
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
