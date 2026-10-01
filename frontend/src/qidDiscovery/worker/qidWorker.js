/* eslint-env worker */
/* global globalThis */
import Papa from "papaparse";
import {
  buildProfilingSource,
  createColumnMetaFromFields,
} from "../profiling/profilingSource";
import { CSV_PREVIEW_ROW_LIMIT, profileTableFromSource } from "../qidProfiler";
import { elapsedMs, logProfiling, nowMs } from "../profilingDiagnostics";

const sessions = new Map();
let nextSessionCounter = 0;

function createSessionId(fileName) {
  nextSessionCounter += 1;
  const prefix = fileName || "table";

  if (globalThis.crypto?.randomUUID) {
    return `${prefix}:${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${nextSessionCounter}`;
}

function serializeError(error) {
  return {
    message: error?.message || String(error),
  };
}

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

/**
 * Parses the uploaded File inside the QID worker, builds the reusable
 * profiling source, runs QID combination search, stores transient profiling
 * and cache state in this worker, and returns aggregate results plus the
 * limited preview rows required by PreviewTable.
 *
 * `reportStage` posts metadata-only stage updates (never row values) so the
 * UI can say what is currently happening.
 */
async function profileTable(
  {
    file,
    previewRowLimit = CSV_PREVIEW_ROW_LIMIT,
    qidDiscoveryConfiguration,
    options,
    logDiagnostics = false,
  },
  requestId,
  reportStage
) {
  const fileName = file?.name;
  const log = (message, details) =>
    logProfiling(logDiagnostics, fileName, message, { requestId, ...details });

  reportStage({ stage: "parsing" });
  let startedAt = nowMs();
  const { rows, fields } = await parseCsvFile(file);
  log("CSV parsed", {
    rows: rows.length,
    columns: fields.length,
    durationMs: elapsedMs(startedAt),
  });

  const parsedPreviewRowLimit = Number(previewRowLimit);
  const safePreviewRowLimit = Number.isFinite(parsedPreviewRowLimit)
    ? Math.max(0, parsedPreviewRowLimit)
    : CSV_PREVIEW_ROW_LIMIT;
  const sessionId = createSessionId(file?.name);
  const columnMeta = createColumnMetaFromFields(fields);

  reportStage({ stage: "profiling", rows: rows.length, columns: fields.length });
  startedAt = nowMs();
  const profilingSource = buildProfilingSource(rows, columnMeta, {
    subjectKeySourceField: options?.subjectKeySourceField || null,
  });
  log("Profiling source built", {
    rows: rows.length,
    columns: fields.length,
    durationMs: elapsedMs(startedAt),
  });

  // Column statistics, Direct Identifier evidence and QID search run in one call.
  reportStage({ stage: "qid-discovery", rows: rows.length, columns: fields.length });
  startedAt = nowMs();
  const profile = profileTableFromSource(profilingSource, columnMeta, options);
  log("Statistics and QID discovery completed", {
    mode: profile.qidSearchMode,
    combinations: profile.qidCombinations?.length ?? 0,
    durationMs: elapsedMs(startedAt),
  });

  sessions.set(sessionId, profilingSource);
  reportStage({ stage: "preparing", rows: rows.length, columns: fields.length });

  return {
    name: file.name,
    rows: rows.length,
    headers: fields,
    data: rows.slice(0, safePreviewRowLimit),
    columnMeta: profile.columnMeta,
    qidCombinations: profile.qidCombinations,
    qidSearchMode: profile.qidSearchMode,
    subjectKeySourceField: profile.subjectKeySourceField,
    subjectKeyAutoDetected: profile.subjectKeyAutoDetected,
    suggestedSubjectKeySourceFields: profile.suggestedSubjectKeySourceFields,
    repeatedMeasurementSummary: profile.repeatedMeasurementSummary,
    profilingSession: {
      type: "worker",
      sessionId,
      qidDiscoveryConfiguration,
    },
    qidDiscoveryConfiguration,
  };
}

/**
 * Reuses an existing worker-local profiling source after schema edits. This
 * refresh does not rescan rows and keeps the session-level combination cache.
 */
function refreshTableProfile({ sessionId, columnMeta, options }) {
  const profilingSource = sessions.get(sessionId);

  if (!profilingSource) {
    throw new Error("QID profiling session was not found.");
  }

  return profileTableFromSource(profilingSource, columnMeta, options);
}

/**
 * Worker-local cache invalidation handler.
 *
 * Disposes transient encoded columns, partitions, rowGroupIds, and evaluated
 * combination cache entries for a table profiling session.
 */
function disposeProfilingSession({ sessionId }) {
  sessions.delete(sessionId);
  return {
    disposed: true,
  };
}

globalThis.onmessage = async ({ data }) => {
  const { requestId, type, payload } = data || {};

  try {
    let response;

    if (type === "PROFILE_TABLE") {
      response = await profileTable(payload, requestId, (progress) =>
        globalThis.postMessage({ requestId, progress })
      );
    } else if (type === "REFRESH_TABLE_PROFILE") {
      response = refreshTableProfile(payload);
    } else if (type === "DISPOSE_PROFILING_SESSION") {
      response = disposeProfilingSession(payload);
    } else {
      throw new Error(`Unsupported QID worker message: ${type}`);
    }

    globalThis.postMessage({
      requestId,
      ok: true,
      payload: response,
    });
  } catch (error) {
    globalThis.postMessage({
      requestId,
      ok: false,
      error: serializeError(error),
    });
  }
};
