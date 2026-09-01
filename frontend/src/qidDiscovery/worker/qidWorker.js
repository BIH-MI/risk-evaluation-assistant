/* eslint-env worker */
/* global globalThis */
import Papa from "papaparse";
import {
  buildProfilingSource,
  createColumnMetaFromFields,
} from "../profiling/profilingSource";
import { CSV_PREVIEW_ROW_LIMIT, profileTableFromSource } from "../qidProfiler";

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
 */
async function profileTable({
  file,
  previewRowLimit = CSV_PREVIEW_ROW_LIMIT,
  options,
}) {
  const { rows, fields } = await parseCsvFile(file);
  const parsedPreviewRowLimit = Number(previewRowLimit);
  const safePreviewRowLimit = Number.isFinite(parsedPreviewRowLimit)
    ? Math.max(0, parsedPreviewRowLimit)
    : CSV_PREVIEW_ROW_LIMIT;
  const sessionId = createSessionId(file?.name);
  const columnMeta = createColumnMetaFromFields(fields);
  const profilingSource = buildProfilingSource(rows, columnMeta, {
    subjectKeySourceField: options?.subjectKeySourceField || null,
  });
  const profile = profileTableFromSource(profilingSource, columnMeta, options);

  sessions.set(sessionId, profilingSource);

  return {
    name: file.name,
    rows: rows.length,
    headers: fields,
    data: rows.slice(0, safePreviewRowLimit),
    columnMeta: profile.columnMeta,
    qidCombinations: profile.qidCombinations,
    qidSearchMode: profile.qidSearchMode,
    subjectKeySourceField: profile.subjectKeySourceField,
    suggestedSubjectKeySourceFields: profile.suggestedSubjectKeySourceFields,
    repeatedMeasurementSummary: profile.repeatedMeasurementSummary,
    profilingSession: {
      type: "worker",
      sessionId,
    },
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
      response = await profileTable(payload);
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
