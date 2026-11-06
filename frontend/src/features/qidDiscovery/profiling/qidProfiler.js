import {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
} from "./profilingSource";
import {
  createEmptySubsetProfilingSummary,
  profileAttributeSubsets,
  SubsetProfilingLimitError,
} from "./subsetProfiler";

// The preview displays examples from at most 500 rows. Profiling still uses
// every accepted record inside the worker. Avoid cloning unused rows to React.
export const CSV_PREVIEW_ROW_LIMIT = 500;

function attachSubsetEvidence(columnMeta, evidenceBySourceField) {
  return columnMeta.map((column) => ({
    ...column,
    subsetEvidence:
      evidenceBySourceField.get(column.sourceField || column.field) || [],
  }));
}

/**
 * Recomputes Distinguishability evidence for the current schema from an
 * existing profiling source. Individual attribute statistics and Direct
 * Identifier evidence are projected onto the schema, then exhaustive subset
 * profiling runs over the eligible attributes and its per-size evidence is
 * attached to each participating attribute.
 */
export function profileTableFromSource(
  profilingSource,
  columnMeta = [],
  profilingConfiguration
) {
  if (!profilingSource) {
    return {
      columnMeta,
      subsetProfilingSummary: createEmptySubsetProfilingSummary(
        profilingConfiguration
      ),
    };
  }

  const profiledColumnMeta = applyStatistics(columnMeta, profilingSource);
  const candidates = buildCandidateColumns(profiledColumnMeta, profilingSource);
  try {
    const { evidenceBySourceField, summary } = profileAttributeSubsets(
      candidates,
      profilingSource,
      profilingConfiguration
    );
    return {
      columnMeta: attachSubsetEvidence(profiledColumnMeta, evidenceBySourceField),
      subsetProfilingSummary: summary,
    };
  } catch (error) {
    if (!(error instanceof SubsetProfilingLimitError)) throw error;
    // Preserve individual statistics, but never save old subset evidence from
    // a previous schema/exclusion state or represent skipped work as zero risk.
    return {
      columnMeta: attachSubsetEvidence(profiledColumnMeta, new Map()),
      subsetProfilingSummary: {
        ...createEmptySubsetProfilingSummary(profilingConfiguration),
        candidateAttributeCount: candidates.length,
        skipped: true,
        warning: error.message,
      },
    };
  }
}

/**
 * Prepares freshly parsed CSV rows without subset profiling: creates column
 * metadata with stable sourceField identities, encodes and profiles every
 * source column once (individual statistics and Direct Identifier
 * value-pattern evidence), and applies the value-pattern exclusion defaults.
 * Attribute subsets are profiled later by profileTableFromSource(), once the
 * initial exclusions are known, so combinations are only computed for the
 * eligible attributes. The returned profilingSource is transient
 * browser-local state (encoded columns and, later, the subset cache) that
 * every profiling run of the table reuses instead of rescanning rows.
 * `delimiter` is the CSV delimiter; with "," a decimal comma is not read as
 * one.
 */
export function prepareParsedTable({ rows, fields, delimiter }) {
  const columnMeta = createColumnMetaFromFields(fields);
  const profilingSource = buildProfilingSource(rows, columnMeta, {
    csvDelimiter: delimiter,
  });

  return {
    columnMeta: applyStatistics(columnMeta, profilingSource),
    profilingSource,
  };
}
