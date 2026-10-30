import { useCallback, useEffect, useState } from "react";

import useActivityAssessmentEvidence from "./useActivityAssessmentEvidence";

/**
 * Optional activity-specific overrides of the selected Dataset Assessment's attribute values.
 * Override tables reference the table-assessment attributes of the assessment they were copied
 * from, so they are copied again whenever another assessment is selected.
 */
export default function useActivityTableOverrides({
  datasets,
  datasetAssessments,
  selectedDatasetAssessment,
}) {
  const {
    scoringSystem,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
    mapDatasetAssessmentTables,
    mapActivityOverrideTables,
    reconcileTables,
  } = useActivityAssessmentEvidence({ datasets, datasetAssessments, selectedDatasetAssessment });

  const [overrideTables, setOverrideTables] = useState(false);
  const [tables, setTables] = useState([]);

  // Datasets and assessments are fetched independently, so mapped tables can lack display
  // metadata until both collections are available.
  useEffect(() => {
    setTables((currentTables) => reconcileTables(currentTables));
  }, [reconcileTables]);

  const toggleOverride = (enabled) => {
    setOverrideTables(enabled);
    setTables(enabled ? mapDatasetAssessmentTables(selectedDatasetAssessment) : []);
  };

  const resetForAssessment = (datasetAssessment) => {
    if (!datasetAssessment) {
      setOverrideTables(false);
      setTables([]);
      return;
    }
    if (overrideTables) setTables(mapDatasetAssessmentTables(datasetAssessment));
  };

  // Used by the edit initialization effect.
  const loadActivityOverrides = useCallback(
    (activity, datasetAssessment) => {
      const hasOverrides = activity.tableAssessments?.length > 0;
      setOverrideTables(hasOverrides);
      setTables(hasOverrides ? mapActivityOverrideTables(activity, datasetAssessment) : []);
    },
    [mapActivityOverrideTables]
  );

  return {
    // Overrides are copied from the selected assessment, so they need it to be loaded.
    canOverride: Boolean(selectedDatasetAssessment),
    overrideTables,
    tables,
    setTables,
    toggleOverride,
    resetForAssessment,
    loadActivityOverrides,
    scoringSystem,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
  };
}
