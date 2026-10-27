/* eslint-env worker */
/* global globalThis */
import { parseCsvFile } from "../profiling/parsing/parseCsvFile";
import {
  CSV_PREVIEW_ROW_LIMIT,
  prepareParsedTable,
  profileTableFromSource,
} from "../profiling/qidProfiler";

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

/**
 * Parses the uploaded File inside the QID worker and prepares it for
 * profiling: encoded source columns, individual statistics and value-pattern
 * Direct Identifier evidence. Subset profiling is not run here; it runs once
 * through REFRESH_TABLE_PROFILE after the initial exclusions are resolved.
 * Header fields are posted as soon as Papa has parsed the first chunk so
 * column-name classification can start while the rest of the file is still
 * parsed and encoded. Only the header names leave this function early.
 */
async function prepareTable(requestId, { file, qidDiscoveryConfiguration }) {
  const startedAt = performance.now();
  let fieldsAt = null;
  const { rows, fields, parsingWarnings } = await parseCsvFile(file, {
    onProgress: () => globalThis.postMessage({ requestId, type: "PROGRESS", progress: { phase: "parsing" } }),
    onFields: (headerFields) => {
      fieldsAt = performance.now();
      globalThis.postMessage({
        requestId,
        type: "PROGRESS",
        progress: { phase: "fields", fields: headerFields },
      });
    },
  });
  const parsedAt = performance.now();
  const sessionId = createSessionId(file?.name);
  const { profilingSource, columnMeta } = prepareParsedTable({ rows, fields });
  const preparedAt = performance.now();

  sessions.set(sessionId, profilingSource);

  return {
    name: file.name,
    parsingWarnings,
    data: rows.slice(0, CSV_PREVIEW_ROW_LIMIT),
    columnMeta,
    subsetProfilingSummary: null,
    profilingSession: {
      type: "worker",
      sessionId,
      qidDiscoveryConfiguration,
    },
    timings: {
      fieldsMs: fieldsAt === null ? null : fieldsAt - startedAt,
      parseMs: parsedAt - startedAt,
      prepareMs: preparedAt - parsedAt,
    },
  };
}

/**
 * Runs the first subset profile or updates it after schema edits, using an
 * existing worker-local source. This
 * refresh does not rescan rows and reuses the session's cached subset metrics.
 */
function refreshTableProfile({
  sessionId,
  columnMeta,
  profilingConfiguration,
}) {
  const profilingSource = sessions.get(sessionId);

  if (!profilingSource) {
    throw new Error("QID profiling session was not found.");
  }

  const startedAt = performance.now();
  const profile = profileTableFromSource(
    profilingSource,
    columnMeta,
    profilingConfiguration
  );

  return {
    ...profile,
    timings: { subsetProfilingMs: performance.now() - startedAt },
  };
}

/**
 * Drops the worker-local profiling source (encoded columns and cached subset
 * metrics) for a table profiling session.
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

    if (type === "PREPARE_TABLE") {
      response = await prepareTable(requestId, payload);
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
