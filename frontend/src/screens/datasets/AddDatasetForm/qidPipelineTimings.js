/*
 * Development-only stage timings for the Add Dataset upload pipeline
 * (CSV parsing, AI screening, initial exclusions, subset profiling). Only
 * durations and counts are recorded, never column values; nothing is sent
 * anywhere or persisted. In production builds every function is a no-op.
 */

import {
  QID_EXPERIMENT_REPORT_ENABLED,
  reportQidExperiment,
} from "./qidExperimentReport";

const ENABLED = QID_EXPERIMENT_REPORT_ENABLED;
const timingsByTable = new Map();

const round = (ms) => (typeof ms === "number" ? Math.round(ms) : ms);

/** Starts the clock for one uploaded table. */
export function startQidPipelineTiming(tableId) {
  if (!ENABLED) return;
  timingsByTable.set(tableId, { startedAt: performance.now(), stages: {} });
}

/** Records a stage duration (ms) or count for a table. */
export function recordQidStage(tableId, stage, value, { once = false } = {}) {
  if (!ENABLED) return;
  const timing = timingsByTable.get(tableId);
  if (!timing || (once && stage in timing.stages)) return;
  timing.stages[stage] = round(value);
}

/** Adds `value` to a counter stage (e.g. AI inputs over several runs). */
export function addQidStage(tableId, stage, value) {
  if (!ENABLED) return;
  const timing = timingsByTable.get(tableId);
  if (!timing) return;
  timing.stages[stage] = (timing.stages[stage] || 0) + value;
}

/** Records the elapsed time since the upload started under `stage`. */
export function markQidStage(tableId, stage, { once = true } = {}) {
  if (!ENABLED) return;
  const timing = timingsByTable.get(tableId);
  if (!timing) return;
  recordQidStage(tableId, stage, performance.now() - timing.startedAt, { once });
}

/**
 * Prints the experiment report once, when the table's current initial
 * profiling has finished. `context` holds the profiled columnMeta, subset
 * summary, configuration and table name (aggregates only).
 */
export function reportQidPipelineTiming(tableId, context = {}) {
  if (!ENABLED) return;
  const timing = timingsByTable.get(tableId);
  if (!timing) return;
  timingsByTable.delete(tableId);
  reportQidExperiment({
    ...context,
    stages: {
      ...timing.stages,
      totalMs: round(performance.now() - timing.startedAt),
    },
  });
}

export function discardQidPipelineTiming(tableId) {
  timingsByTable.delete(tableId);
}
