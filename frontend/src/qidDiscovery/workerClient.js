import Papa from "papaparse";
import {
  CSV_PREVIEW_ROW_LIMIT,
  createColumnMetaFromFields,
  profileTableFromSource,
  profileTableRows,
} from "./qidProfiler";
import { DEFAULT_QID_DISCOVERY_OPTIONS } from "./search/ranking";

let qidWorker = null;
let qidWorkerUnavailable = false;
let nextRequestId = 0;
const pendingRequests = new Map();

function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      worker: false,
      complete: ({ data: rows, meta: { fields = [] } }) => {
        resolve({
          rows,
          fields,
        });
      },
      error: reject,
    });
  });
}

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

async function profileTableSynchronously(file, previewRowLimit, searchOptions) {
  const { rows, fields } = await parseCsvFile(file);
  const columnMeta = createColumnMetaFromFields(fields);
  const profile = profileTableRows(rows, columnMeta, searchOptions);

  return {
    name: file.name,
    rows: rows.length,
    headers: fields,
    data: rows.slice(0, previewRowLimit),
    columnMeta: profile.columnMeta,
    qidCombinations: profile.qidCombinations,
    qidSearchMode: profile.qidSearchMode,
    profilingSession: {
      type: "sync",
      source: profile.profilingSource,
    },
    qidProcessingMode: "sync",
  };
}

/**
 * Profiles an uploaded CSV file and searches QID combinations. In browsers
 * with Worker support, the full parse/profile/search pipeline runs in a
 * dedicated worker so large datasets do not block the React UI thread.
 *
 * If Worker support is unavailable, the same pure functions run synchronously
 * as a fallback for small tables.
 */
export async function profileUploadedTable(file, options = {}) {
  const {
    previewRowLimit = CSV_PREVIEW_ROW_LIMIT,
    searchOptions = DEFAULT_QID_DISCOVERY_OPTIONS,
  } = options;
  const worker = getQidWorker();

  if (worker) {
    const profile = await postQidWorkerMessage("PROFILE_TABLE", {
      file,
      previewRowLimit,
      options: searchOptions,
    });

    return {
      ...profile,
      qidProcessingMode: "worker",
    };
  }

  return profileTableSynchronously(file, previewRowLimit, searchOptions);
}

/**
 * Refreshes QID results after schema changes. Per-attribute profiles and
 * already evaluated combinations are reused from the table profiling session.
 */
export async function refreshUploadedTableProfile(
  profilingSession,
  columnMeta,
  options = {}
) {
  const { searchOptions = DEFAULT_QID_DISCOVERY_OPTIONS } = options;

  if (!profilingSession) {
    return {
      columnMeta,
      qidCombinations: [],
      qidSearchMode: "none",
    };
  }

  if (profilingSession.type === "worker") {
    return postQidWorkerMessage("REFRESH_TABLE_PROFILE", {
      sessionId: profilingSession.sessionId,
      columnMeta,
      options: searchOptions,
    });
  }

  return profileTableFromSource(
    profilingSession.source,
    columnMeta,
    searchOptions
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
