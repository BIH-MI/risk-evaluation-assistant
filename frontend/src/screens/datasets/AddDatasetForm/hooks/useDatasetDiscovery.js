import { useProfilingSession } from "features/qidDiscovery/hooks/useProfilingSession";
import { useAiClassification } from "features/qidDiscovery/hooks/useAiClassification";
import { useDatasetSchemaEditor } from "./useDatasetSchemaEditor";
import { useAiResearcherReview } from "features/qidDiscovery/hooks/useAiResearcherReview";
import { useAiExclusionReconciliation } from "features/qidDiscovery/hooks/useAiExclusionReconciliation";
import { useInitialProfiling } from "features/qidDiscovery/hooks/useInitialProfiling";
import { useDatasetScreeningReview } from "./useDatasetScreeningReview";

/**
 * Dataset-screen integration: connects QID classification/profiling to the
 * screen's schema editor and researcher controls in dependency order.
 * The QID feature does not import this screen-specific composition hook.
 * Reconciliation consumes both classification results and schema actions, so
 * neither producer needs a callback to a hook created later in the render.
 *
 * Flow: classification -> schema actions -> exclusion reconciliation -> initial
 * profiling. Researcher controls update both the suggestion review and schema.
 * Returned callbacks are intended for the screen's CSV dropzone and preview;
 * this hook does not own a second copy of tables or persist any data.
 */
export function useDatasetDiscovery({
  tables,
  setTables,
  setErrors,
  setWarnings,
  selectedAiModelId,
  aiScreeningEnabled,
  t,
}) {
  const {
    prepareUploadedCsv,
    startInitialSubsetProfiling,
    refreshSubsetProfile,
    disposeProfilingSession,
  } = useProfilingSession({
    tables,
    setTables,
    setErrors,
    t,
  });

  const {
    aiStateByTable,
    classifyFields,
    preloadModel,
    handleColumnRenamed,
    handleColumnDeleted,
    handleTableRemoved,
    updateTableState,
  } = useAiClassification({
    tables,
    modelId: selectedAiModelId,
    enabled: aiScreeningEnabled,
  });

  const {
    addUploadedTablePlaceholder,
    addManualTable,
    addAttribute,
    deleteAttribute,
    removeTable,
    renameTable,
    renameAttribute,
    changeAttributeDataType,
    changeAttributeExclusion,
    applyAiExclusionDecisions,
  } = useDatasetSchemaEditor({
    tables,
    setTables,
    setErrors,
    setWarnings,
    refreshSubsetProfile,
    disposeProfilingSession,
    onColumnRenamed: handleColumnRenamed,
    onColumnDeleted: handleColumnDeleted,
    onTableRemoved: handleTableRemoved,
    t,
  });

  const { handleManualExclusionChange } =
    useAiResearcherReview(updateTableState);
  const { suppressLateAutoExclusions } = useAiExclusionReconciliation({
    tables,
    aiStateByTable,
    onAiExclusionDecisions: applyAiExclusionDecisions,
  });

  // Runs each uploaded table's first subset profiling once, after CSV
  // preparation and AI screening have both finished (or AI timed out).
  useInitialProfiling({
    tables,
    aiStateByTable,
    startInitialSubsetProfiling,
    suppressLateAutoExclusions,
  });

  const { handleExcludedChange } = useDatasetScreeningReview({
    tables,
    handleManualExclusionChange,
    changeAttributeExclusion,
  });

  return {
    aiStateByTable,
    classifyFields,
    preloadModel,
    prepareUploadedCsv,
    addUploadedTablePlaceholder,
    addManualTable,
    addAttribute,
    deleteAttribute,
    removeTable,
    renameTable,
    renameAttribute,
    changeAttributeDataType,
    handleExcludedChange,
  };
}
