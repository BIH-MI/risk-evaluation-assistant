/* global globalThis */

/**
 * Console diagnostics for CSV profiling (main thread and QID worker).
 *
 * PRIVACY: callers pass metadata only (file name, sizes, row/column counts, timings, search
 * mode, counts). Never pass rows, cell values, encoded columns, equivalence classes or the
 * profiling source: this application processes health data.
 *
 * Info logs are on in development builds. In a production build they can be enabled for
 * performance testing with localStorage.setItem("rea.csvProfilingLogs", "true").
 * Errors are always logged.
 */
const PREFIX = "[CSV Profiling]";
const STORAGE_KEY = "rea.csvProfilingLogs";

export function isProfilingDiagnosticsEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "true";
  } catch (_err) {
    return false;
  }
}

export function nowMs() {
  return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

export function elapsedMs(startedAt) {
  return Math.round(nowMs() - startedAt);
}

function label(fileName, message) {
  return fileName ? `${PREFIX}[${fileName}] ${message}` : `${PREFIX} ${message}`;
}

export function logProfiling(enabled, fileName, message, details) {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.info(label(fileName, message), details || {});
}

export function logProfilingError(fileName, message, details) {
  // eslint-disable-next-line no-console
  console.error(label(fileName, message), details || {});
}
