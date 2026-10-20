/* eslint-disable no-console */
/*
 * Development-only experiment report for QID Discovery research (printed to
 * the browser DevTools console after a table's initial subset profiling).
 *
 * It only reads results the pipeline already produced: per-attribute
 * `statistics`, per-size `subsetEvidence` (summarized with the existing
 * summarizeSubsetEvidence, equal weight per subset size), the subset
 * profiling summary and the recorded stage timings. No profiling is rerun
 * and no combinations are enumerated. Only column names and aggregate
 * numbers are logged: never row values, examples, equivalence classes or
 * encoded arrays. Nothing is sent anywhere or stored beyond this tab's memory.
 *
 * Repeated runs: window.reaQidStudy.start("name") groups the following
 * uploads; see window.reaQidStudy.help().
 */
import { summarizeSubsetEvidence } from "qidDiscovery";
import { shouldAutoExcludeDirectIdentifier } from "qidDiscovery/directIdentifierPolicy";

export const QID_EXPERIMENT_REPORT_ENABLED =
  process.env.NODE_ENV === "development";

const NOT_MEASURED = "not measured";
const MEASURES = [
  ["distinction", "Distinction"],
  ["separation", "Separation"],
  ["singletonFraction", "Singleton fraction"],
];

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

const formatMs = (ms) =>
  isNumber(ms) ? `${Math.round(ms)} ms (${(ms / 1000).toFixed(2)} s)` : NOT_MEASURED;

const formatScore = (value) => (isNumber(value) ? value.toFixed(4) : NOT_MEASURED);

// Linear interpolation between closest ranks (R type 7 / NumPy default).
function quantile(sortedValues, probability) {
  if (!sortedValues.length) return null;
  const position = (sortedValues.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return (
    sortedValues[lower] +
    (sortedValues[upper] - sortedValues[lower]) * (position - lower)
  );
}

/** Five-number summary of the available (non-null, finite) values only. */
function describe(values) {
  const sorted = values.filter(isNumber).sort((left, right) => left - right);
  return {
    n: sorted.length,
    min: sorted.length ? sorted[0] : null,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

const formatDistribution = (stats) =>
  stats.n
    ? `${[stats.min, stats.q1, stats.median, stats.q3, stats.max]
        .map(formatScore)
        .join(" / ")} (n=${stats.n})`
    : NOT_MEASURED;

// Mirrors buildCandidateColumns(): what took part in combination profiling.
const isEligible = (column) =>
  column.excluded !== true &&
  column.hasObservedData === true &&
  !shouldAutoExcludeDirectIdentifier(column.directIdentifierEvidence);

function getExclusionSource(column) {
  if (column.manualExclusionDecision === true) return "researcher decision";
  if (column.aiAutoExcluded === true) return "AI";
  if (
    column.autoExcludedDirectIdentifier === true ||
    shouldAutoExcludeDirectIdentifier(column.directIdentifierEvidence)
  ) {
    return "value pattern";
  }
  if (column.hasObservedData !== true) return "no observed data";
  return "not recorded";
}

// Number of evaluated combinations per size, read from the evidence: every
// combination of size k is counted once by each of its k attributes.
function combinationsPerSize(eligibleColumns) {
  const containing = new Map();
  eligibleColumns.forEach((column) => {
    (column.subsetEvidence || []).forEach((evidence) => {
      const size = Number(evidence?.subsetSize);
      const count = Number(evidence?.evaluatedSubsetCount);
      if (!Number.isFinite(size) || !Number.isFinite(count)) return;
      containing.set(size, (containing.get(size) || 0) + count);
    });
  });
  return Array.from(containing.entries())
    .sort(([left], [right]) => left - right)
    .map(([size, total]) => ({ size, combinations: total / size }));
}

function buildRunReport({ tableName, columnMeta, summary, configuration, stages }) {
  const columns = columnMeta || [];
  const eligible = columns.filter(isEligible);
  const excluded = columns.filter((column) => column.excluded === true);
  const recordCount = columns.find((column) => isNumber(column.statistics?.recordCount))
    ?.statistics.recordCount;

  const individual = eligible.map((column) => ({
    attribute: column.field,
    distinction: column.statistics?.distinction ?? null,
    separation: column.statistics?.separation ?? null,
    singletonFraction: column.statistics?.singletonFraction ?? null,
  }));
  const contextual = eligible.map((column) => {
    const overall = summarizeSubsetEvidence(column.subsetEvidence || []);
    return {
      attribute: column.field,
      meanDistinction: overall?.meanDistinction ?? null,
      meanSeparation: overall?.meanSeparation ?? null,
      meanSingletonFraction: overall?.meanSingletonFraction ?? null,
      combinationsContaining: overall?.evaluatedSubsetCount ?? 0,
    };
  });

  const byDescending = (key) => (left, right) =>
    (isNumber(right[key]) ? right[key] : -Infinity) -
    (isNumber(left[key]) ? left[key] : -Infinity);

  return {
    tableName,
    recordCount: isNumber(recordCount) ? recordCount : null,
    attributeCount: columns.length,
    excluded: excluded.map((column) => ({
      attribute: column.field,
      source: getExclusionSource(column),
    })),
    eligibleCount: eligible.length,
    candidateAttributeCount: summary?.candidateAttributeCount ?? null,
    maxSubsetSize: summary?.maxSubsetSize ?? configuration?.maxSubsetSize ?? null,
    maxEvaluatedSubsets:
      summary?.maxEvaluatedSubsets ?? configuration?.maxEvaluatedSubsets ?? null,
    evaluatedSubsetCount: summary?.evaluatedSubsetCount ?? null,
    perSize: combinationsPerSize(eligible),
    distributions: Object.fromEntries(
      MEASURES.map(([key]) => [key, describe(individual.map((row) => row[key]))])
    ),
    topIndividual: individual.slice().sort(byDescending("distinction")).slice(0, 5),
    contextual,
    topContextual: contextual.slice().sort(byDescending("meanDistinction")).slice(0, 5),
    stages,
  };
}

/* ---------------------------- repeated runs ---------------------------- */

const study = { name: null, runs: [] };

// Conditions that must match for runs to be summarized together.
function runConditions(report) {
  const { stages } = report;
  return {
    dataset: `${report.tableName} | ${report.recordCount ?? "?"} records | ${report.attributeCount} attributes`,
    profiling: `max size ${report.maxSubsetSize}, limit ${report.maxEvaluatedSubsets}, eligible ${report.eligibleCount}`,
    aiModel: stages.aiModel || NOT_MEASURED,
    model: stages.modelState || NOT_MEASURED,
    aiPredictions:
      stages.aiInputsClassified === undefined
        ? NOT_MEASURED
        : stages.aiInputsClassified === 0
          ? "all cached"
          : stages.aiInputsFromCache
            ? "partly cached"
            : "freshly classified",
    aiOutcome: stages.aiScreeningTimedOut
      ? "timed out"
      : stages.aiUnavailableColumns
        ? "unavailable"
        : "completed",
  };
}

const conditionKey = (conditions) => JSON.stringify(conditions);

function summarizeTimes(runs) {
  const stats = describe(runs.map((run) => run.totalMs));
  return {
    n: stats.n,
    median: stats.n >= 2 ? stats.median : null,
    q1: stats.n >= 2 ? stats.q1 : null,
    q3: stats.n >= 2 ? stats.q3 : null,
  };
}

function studyGroups() {
  const groups = new Map();
  study.runs.forEach((run) => {
    const key = conditionKey(run.conditions);
    if (!groups.has(key)) groups.set(key, { conditions: run.conditions, runs: [] });
    groups.get(key).runs.push(run);
  });
  return Array.from(groups.values());
}

function printStudySummary() {
  if (!study.name) {
    console.log(
      "Repeated runs: no study active. Run reaQidStudy.start(\"name\") before uploading comparable runs."
    );
    return;
  }
  const groups = studyGroups();
  console.log(`Repeated runs (study "${study.name}"): ${study.runs.length} completed run(s)`);
  if (groups.length > 1) {
    console.warn(
      `Study "${study.name}" contains ${groups.length} different run conditions; they are summarized separately and must not be pooled.`
    );
  }
  groups.forEach(({ conditions, runs }) => {
    const times = summarizeTimes(runs);
    console.log("  Conditions:", conditions);
    if (times.n < 2) {
      console.log(
        `  ${times.n} completed run: total ${formatMs(runs[0]?.totalMs)} (single run, no median/IQR)`
      );
    } else {
      console.log(
        `  ${times.n} completed runs: median total ${formatMs(times.median)}, IQR ${formatMs(times.q1)} - ${formatMs(times.q3)} (IQR width ${formatMs(times.q3 - times.q1)})`
      );
    }
  });
}

function installStudyHelper() {
  if (!QID_EXPERIMENT_REPORT_ENABLED || typeof window === "undefined") return;
  window.reaQidStudy = {
    start(name) {
      if (!name) {
        console.warn("reaQidStudy.start(name): a study name is required.");
        return;
      }
      study.name = String(name);
      study.runs = [];
      console.log(`Study "${study.name}" started. Upload comparable runs now.`);
    },
    reset() {
      study.runs = [];
      console.log(`Study "${study.name || "(none)"}" reset; runs cleared.`);
    },
    stop() {
      console.log(`Study "${study.name || "(none)"}" stopped.`);
      study.name = null;
    },
    runs() {
      console.table(
        study.runs.map((run, index) => ({
          run: index + 1,
          totalMs: Math.round(run.totalMs),
          ...run.conditions,
        }))
      );
      return study.runs.length;
    },
    summary: printStudySummary,
    help() {
      console.log(
        [
          "reaQidStudy.start(name)  start/reset a named study; later uploads are recorded in it",
          "reaQidStudy.runs()       show individual run results",
          "reaQidStudy.summary()    run count, median and IQR of total time per condition group",
          "reaQidStudy.reset()      clear runs of the current study",
          "reaQidStudy.stop()       stop recording",
          "Runs are grouped by dataset, profiling configuration, model state (cold/warm),",
          "AI prediction caching and AI outcome. Results live in this tab's memory only.",
        ].join("\n")
      );
    },
  };
}

installStudyHelper();

/* ------------------------------- printing ------------------------------ */

function resultsParagraph(report) {
  const { stages } = report;
  const d = report.distributions.distinction;
  const sep = report.distributions.separation;
  const sf = report.distributions.singletonFraction;
  const excludedBySource = report.excluded.reduce((counts, { source }) => {
    counts[source] = (counts[source] || 0) + 1;
    return counts;
  }, {});
  const exclusionText = Object.keys(excludedBySource).length
    ? Object.entries(excludedBySource)
        .map(([source, count]) => `${count} by ${source}`)
        .join(", ")
    : "none";
  const fmt = (value) => (isNumber(value) ? value.toFixed(3) : NOT_MEASURED);
  const records = isNumber(report.recordCount)
    ? report.recordCount.toLocaleString("en")
    : NOT_MEASURED;

  return (
    `The uploaded dataset contained ${records} records and ${report.attributeCount} attributes. ` +
    `${report.excluded.length} attribute(s) were excluded before combination profiling (${exclusionText}), ` +
    `leaving ${report.eligibleCount} eligible attributes. With a maximum combination size of ${report.maxSubsetSize ?? NOT_MEASURED}, ` +
    `REA evaluated ${report.evaluatedSubsetCount ?? NOT_MEASURED} attribute combinations ` +
    `(${report.perSize.map(({ size, combinations }) => `${combinations} of size ${size}`).join(", ") || NOT_MEASURED}). ` +
    `Initial processing took ${formatMs(stages.totalMs)} end to end, including ${formatMs(stages.csvParseMs)} for CSV parsing, ` +
    `${formatMs(stages.csvPrepareMs)} for data preparation and encoding, and ${formatMs(stages.subsetProfilingMs)} for combination profiling; ` +
    `AI screening ${stages.aiScreeningTimedOut ? "timed out" : stages.aiUnavailableColumns ? "was unavailable" : "completed"} ` +
    `(${stages.aiModel || "model not recorded"}, ${stages.modelState || NOT_MEASURED} start, classification ${formatMs(stages.aiClassificationMs)}). ` +
    `Across eligible attributes, individual Distinction had a median of ${fmt(d.median)} (IQR ${fmt(d.q1)}-${fmt(d.q3)}), ` +
    `Separation a median of ${fmt(sep.median)} (IQR ${fmt(sep.q1)}-${fmt(sep.q3)}), and the singleton fraction a median of ` +
    `${fmt(sf.median)} (IQR ${fmt(sf.q1)}-${fmt(sf.q3)}). ` +
    `The attribute with the highest contextual mean Distinction across the combinations containing it was ` +
    `${report.topContextual[0]?.attribute ?? NOT_MEASURED} (${fmt(report.topContextual[0]?.meanDistinction)}).`
  );
}

function printReport(report) {
  const { stages } = report;
  const roundRow = (row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        isNumber(value) && !Number.isInteger(value) ? Number(value.toFixed(4)) : value ?? NOT_MEASURED,
      ])
    );

  console.group("[REA QID EXPERIMENT]");
  console.log(
    [
      "Dataset:",
      `  Table: ${report.tableName}`,
      `  Records: ${isNumber(report.recordCount) ? report.recordCount : NOT_MEASURED}`,
      `  Attributes: ${report.attributeCount}`,
      `  Excluded: ${report.excluded.length}${
        report.excluded.length
          ? ` (${report.excluded.map(({ attribute, source }) => `${attribute}: ${source}`).join(", ")})`
          : ""
      }`,
      `  Eligible: ${report.eligibleCount}${
        isNumber(report.candidateAttributeCount) &&
        report.candidateAttributeCount !== report.eligibleCount
          ? ` (profiler reported ${report.candidateAttributeCount})`
          : ""
      }`,
      "",
      "Profiling:",
      `  Maximum combination size: ${report.maxSubsetSize ?? NOT_MEASURED}`,
      `  Evaluated combinations: ${report.evaluatedSubsetCount ?? NOT_MEASURED}`,
      `  Combinations per size: ${
        report.perSize.map(({ size, combinations }) => `${size}: ${combinations}`).join(", ") ||
        NOT_MEASURED
      }`,
      `  Computational limit (maxEvaluatedSubsets): ${report.maxEvaluatedSubsets ?? NOT_MEASURED}`,
      "",
      "Timing (wall clock; parallel stages are not summed):",
      `  Total (upload to initial profiling done): ${formatMs(stages.totalMs)}`,
      `  Preparation: parsing ${formatMs(stages.csvParseMs)}, encoding/statistics ${formatMs(stages.csvPrepareMs)}, headers available after ${formatMs(stages.csvFieldsAvailableAtMs)}`,
      `  AI: ${stages.aiModel || NOT_MEASURED}, model ${stages.modelState || NOT_MEASURED}, load ${formatMs(stages.modelLoadMs)}, classification ${formatMs(stages.aiClassificationMs)}, settled after ${formatMs(stages.aiSettledAtMs)}${
        stages.aiScreeningTimedOut ? " | TIMED OUT (fallback)" : ""
      }${stages.aiUnavailableColumns ? ` | unavailable for ${stages.aiUnavailableColumns} column(s)` : ""}`,
      `  AI auto-exclusions applied: ${stages.aiAutoExclusions ?? NOT_MEASURED}; waiting for AI after preparation: ${
        isNumber(stages.initialProfilingStartedAtMs) && isNumber(stages.preparedAtMs)
          ? formatMs(stages.initialProfilingStartedAtMs - stages.preparedAtMs)
          : NOT_MEASURED
      }`,
      `  Subset profiling: ${formatMs(stages.subsetProfilingMs)}`,
      "",
      "Individual score distributions (eligible attributes; min / Q1 / median / Q3 / max):",
      ...MEASURES.map(
        ([key, label]) => `  ${label}: ${formatDistribution(report.distributions[key])}`
      ),
    ].join("\n")
  );

  console.log("Top individual attributes (by Distinction):");
  console.table(report.topIndividual.map(roundRow));
  console.log(
    "Top contextual combination attributes (means over combinations containing the attribute, equal weight per size; not scores of single combinations):"
  );
  console.table(report.topContextual.map(roundRow));
  console.log("All eligible attributes (contextual):");
  console.table(report.contextual.map(roundRow));

  printStudySummary();

  console.log("Results paragraph (template, actual measurements):\n\n" + resultsParagraph(report));
  console.groupEnd();
}

/**
 * Prints the experiment report for one table and, if a study is active,
 * records the run. Called once per successful, current initial profiling.
 */
export function reportQidExperiment(context) {
  if (!QID_EXPERIMENT_REPORT_ENABLED) return;
  try {
    const report = buildRunReport(context);
    if (study.name && isNumber(report.stages.totalMs)) {
      study.runs.push({ totalMs: report.stages.totalMs, conditions: runConditions(report) });
    }
    printReport(report);
  } catch (error) {
    console.warn("[REA QID EXPERIMENT] report failed:", error?.message);
  }
}
