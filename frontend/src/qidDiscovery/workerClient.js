import Papa from "papaparse";
import {
  CSV_PREVIEW_ROW_LIMIT,
  createColumnMetaFromFields,
  profileTableFromSource,
  profileTableRows,
} from "./qidProfiler";
import {
  elapsedMs,
  isProfilingDiagnosticsEnabled,
  logProfiling,
  nowMs,
} from "./profilingDiagnostics";

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
    const { requestId, ok, payload, error, progress } = data || {};
    const pending = pendingRequests.get(requestId);
    if (!pending) return;

    // Stage updates carry metadata only and do not settle the request.
    if (progress) {
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

  if (type === "PROFILE_TABLE") {
    logProfiling(payload.logDiagnostics, payload.file?.name, "Worker request started", {
      requestId,
    });
  }

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

async function profileTableSynchronously(
  file,
  previewRowLimit,
  qidDiscoveryConfiguration,
  qidOptions,
  onProgress
) {
  const logDiagnostics = isProfilingDiagnosticsEnabled();
  logProfiling(logDiagnostics, file.name, "Worker unavailable; using synchronous fallback");

  onProgress?.({ stage: "parsing" });
  let startedAt = nowMs();
  const { rows, fields } = await parseCsvFile(file);
  logProfiling(logDiagnostics, file.name, "CSV parsed", {
    rows: rows.length,
    columns: fields.length,
    durationMs: elapsedMs(startedAt),
  });

  const columnMeta = createColumnMetaFromFields(fields);
  // The synchronous path builds the profiling source and runs QID discovery in one call.
  onProgress?.({ stage: "qid-discovery", rows: rows.length, columns: fields.length });
  startedAt = nowMs();
  const profile = profileTableRows(rows, columnMeta, qidOptions);
  logProfiling(logDiagnostics, file.name, "Profiling source, statistics and QID discovery completed", {
    mode: profile.qidSearchMode,
    combinations: profile.qidCombinations?.length ?? 0,
    durationMs: elapsedMs(startedAt),
  });

  return {
    name: file.name,
    rows: rows.length,
    headers: fields,
    data: rows.slice(0, previewRowLimit),
    columnMeta: profile.columnMeta,
    qidCombinations: profile.qidCombinations,
    qidSearchMode: profile.qidSearchMode,
    subjectKeySourceField: profile.subjectKeySourceField,
    subjectKeyAutoDetected: profile.subjectKeyAutoDetected,
    suggestedSubjectKeySourceFields: profile.suggestedSubjectKeySourceFields,
    repeatedMeasurementSummary: profile.repeatedMeasurementSummary,
    profilingSession: {
      type: "sync",
      source: profile.profilingSource,
      qidDiscoveryConfiguration,
    },
    qidDiscoveryConfiguration,
    qidProcessingMode: "sync",
  };
}

/**
 * Profiles an uploaded CSV file, encodes each observed source column, evaluates
 * Direct Identifier evidence, and runs initial QID discovery. The worker path
 * keeps large CSV parsing and search work off the React UI thread.
 *
 * If Worker support is unavailable, the same pure profiling functions run
 * synchronously so the data flow and privacy boundary remain identical.
 */
export async function profileUploadedTable(file, options = {}) {
  const {
    previewRowLimit = CSV_PREVIEW_ROW_LIMIT,
    qidDiscoveryConfiguration,
    subjectKeySourceField,
    onProgress,
  } = options;

  if (!qidDiscoveryConfiguration?.search) {
    throw new Error("QID Discovery Configuration must be selected.");
  }

  const qidOptions = {
    qidDiscoverySearchConfiguration: qidDiscoveryConfiguration.search,
  };
  if (subjectKeySourceField) {
    qidOptions.subjectKeySourceField = subjectKeySourceField;
  }
  const worker = getQidWorker();

  if (worker) {
    const profile = await postQidWorkerMessage(
      "PROFILE_TABLE",
      {
        file,
        previewRowLimit,
        qidDiscoveryConfiguration,
        options: qidOptions,
        // The worker cannot read localStorage, so the main thread decides.
        logDiagnostics: isProfilingDiagnosticsEnabled(),
      },
      { onProgress }
    );

    return {
      ...profile,
      qidProcessingMode: "worker",
    };
  }

  return profileTableSynchronously(
    file,
    previewRowLimit,
    qidDiscoveryConfiguration,
    qidOptions,
    onProgress
  );
}

/**
 * Refreshes QID discovery from the existing profiling session after schema,
 * exclusion, or subject-key changes. Encoded source columns and combination
 * cache entries are reused, avoiding another CSV scan.
 */
export async function refreshUploadedTableProfile(
  profilingSession,
  columnMeta,
  options = {}
) {
  const {
    qidDiscoveryConfiguration = profilingSession?.qidDiscoveryConfiguration,
    subjectKeySourceField,
  } = options;

  if (!qidDiscoveryConfiguration?.search) {
    throw new Error("QID Discovery Configuration must be selected.");
  }

  const qidOptions = {
    qidDiscoverySearchConfiguration: qidDiscoveryConfiguration.search,
  };

  if (Object.prototype.hasOwnProperty.call(options, "subjectKeySourceField")) {
    qidOptions.subjectKeySourceField = subjectKeySourceField;
  }

  if (!profilingSession) {
    return {
      columnMeta,
      qidCombinations: [],
      qidSearchMode: "none",
      subjectKeySourceField: qidOptions.subjectKeySourceField || null,
      subjectKeyAutoDetected: false,
      suggestedSubjectKeySourceFields: [],
      repeatedMeasurementSummary: null,
    };
  }

  if (profilingSession.type === "worker") {
    return postQidWorkerMessage("REFRESH_TABLE_PROFILE", {
      sessionId: profilingSession.sessionId,
      columnMeta,
      options: qidOptions,
    });
  }

  return profileTableFromSource(
    profilingSession.source,
    columnMeta,
    qidOptions
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
