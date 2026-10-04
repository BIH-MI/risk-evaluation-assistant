import {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
} from "./profiling/profilingSource";
import {
  createEmptySubsetProfilingSummary,
  profileAttributeSubsets,
} from "./subsets/subsetProfiler";

export const CSV_PREVIEW_ROW_LIMIT = 10000;

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
  const { evidenceBySourceField, summary } = profileAttributeSubsets(
    buildCandidateColumns(profiledColumnMeta, profilingSource),
    profilingSource,
    profilingConfiguration
  );

  return {
    columnMeta: attachSubsetEvidence(profiledColumnMeta, evidenceBySourceField),
    subsetProfilingSummary: summary,
  };
}

/**
 * Profiles freshly parsed CSV rows. The returned profilingSource is transient
 * browser-local state (encoded columns and subset cache) that later refreshes
 * reuse instead of rescanning rows.
 */
export function profileParsedTable({ rows, fields }, profilingConfiguration) {
  const columnMeta = createColumnMetaFromFields(fields);
  const profilingSource = buildProfilingSource(rows, columnMeta);

  return {
    ...profileTableFromSource(
      profilingSource,
      columnMeta,
      profilingConfiguration
    ),
    profilingSource,
  };
}
