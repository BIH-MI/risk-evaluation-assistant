import {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
} from "./profiling/profilingSource";
import { profileAttributeSubsets } from "./subsets/subsetProfiler";
import { validateQidDiscoveryProfilingConfiguration } from "./configuration/validateQidDiscoveryProfilingConfiguration";

export const CSV_PREVIEW_ROW_LIMIT = 10000;

function getProfilingConfiguration(options = {}) {
  return validateQidDiscoveryProfilingConfiguration(
    options.qidDiscoveryProfilingConfiguration || options.profilingConfiguration
  );
}

function attachSubsetEvidence(
  columnMeta = [],
  profilingSource,
  evidenceByStableAttributeId
) {
  return columnMeta.map((column) => {
    const sourceField = column.sourceField || column.field;
    const source = profilingSource?.columnsBySourceField?.get(sourceField);
    const subsetContext = source
      ? evidenceByStableAttributeId.get(source.stableAttributeId)
      : null;

    return {
      ...column,
      subsetEvidence: subsetContext?.bySubsetSize || [],
    };
  });
}

const emptySubsetProfilingSummary = (configuration) => ({
  maxSubsetSize: configuration.maxSubsetSize,
  maxEvaluatedSubsets: configuration.maxEvaluatedSubsets,
  evaluatedSubsetCount: 0,
  candidateAttributeCount: 0,
});

/**
 * Reruns profiling refresh from an existing profiling source. Individual
 * attribute statistics and Direct Identifier evidence are projected onto the
 * current schema before exhaustive subset profiling is rerun and aggregated
 * back onto each participating attribute.
 */
export function profileTableFromSource(
  profilingSource,
  columnMeta = [],
  options = {}
) {
  const profilingConfiguration = getProfilingConfiguration(options);

  if (!profilingSource) {
    return {
      columnMeta,
      subsetProfilingSummary: emptySubsetProfilingSummary(
        profilingConfiguration
      ),
    };
  }

  const profiledColumnMeta = applyStatistics(
    columnMeta,
    profilingSource,
    options
  );
  const candidateColumns = buildCandidateColumns(
    profiledColumnMeta,
    profilingSource
  );
  const { evidenceByStableAttributeId, summary } = profileAttributeSubsets(
    candidateColumns,
    profilingSource,
    profilingConfiguration
  );

  return {
    columnMeta: attachSubsetEvidence(
      profiledColumnMeta,
      profilingSource,
      evidenceByStableAttributeId
    ),
    subsetProfilingSummary: summary,
  };
}

/**
 * Builds a reusable profiling source from parsed rows, then immediately
 * calculates individual and attribute-subset Distinguishability evidence. The
 * returned profilingSource is transient browser-local state containing encoded
 * columns and caches for later refreshes.
 */
export function profileTableRows(rows = [], columnMeta = [], options = {}) {
  const profilingSource = buildProfilingSource(rows, columnMeta, options);

  return {
    ...profileTableFromSource(profilingSource, columnMeta, options),
    profilingSource,
  };
}

export {
  applyStatistics,
  buildCandidateColumns,
  buildProfilingSource,
  createColumnMetaFromFields,
};
