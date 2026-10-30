import { useCallback, useMemo } from "react";

import { buildAttributeEvidence } from "screens/datasetAssessments/AddEditDatasetAssessmentForm/evidence/buildAttributeEvidence";
import { findPreviousAssessmentsForDataset } from "screens/datasetAssessments/AddEditDatasetAssessmentForm/evidence/previousAssessmentEvidence";
import { buildDatasetAttributeDisplayEvidence } from "screens/datasetAssessments/evidence/datasetAttributeDisplayEvidence";
import { LEGACY_ATTRIBUTE_SCORING_SYSTEM } from "utils/AttributeScale";
import {
  buildAssessmentAttributeLookup,
  buildDatasetAttributeDataTypeLookup,
  buildOriginalAssessmentValueLookup,
  mapAssessmentTablesToFormState,
  reconcileTableReferences,
} from "./dataSharingActivityFormUtils";

const scoringSystemOf = (datasetAssessment) =>
  datasetAssessment?.attributeScoringSystem || LEGACY_ATTRIBUTE_SCORING_SYSTEM;

/**
 * Evidence shown in the table-override editor and the lookups that map the selected Dataset
 * Assessment's tables to editable tables. Owns no state.
 */
export default function useActivityAssessmentEvidence({
  datasets,
  datasetAssessments,
  selectedDatasetAssessment,
}) {
  const datasetId = selectedDatasetAssessment?.datasetId;

  const datasetAttributeDataTypeLookup = useMemo(
    () => buildDatasetAttributeDataTypeLookup(datasets),
    [datasets]
  );
  const assessmentAttributeLookup = useMemo(
    () => buildAssessmentAttributeLookup(datasetAssessments),
    [datasetAssessments]
  );

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => String(dataset.id) === String(datasetId)) || null,
    [datasetId, datasets]
  );
  const datasetAttributeDisplayEvidenceLookup = useMemo(() => {
    const lookup = new Map();

    (selectedDataset?.tables || []).forEach((table) => {
      buildDatasetAttributeDisplayEvidence(table).forEach((displayEvidence, attributeId) => {
        lookup.set(attributeId, displayEvidence);
      });
    });

    return lookup;
  }, [selectedDataset]);

  const scoringSystem = scoringSystemOf(selectedDatasetAssessment);

  // The selected Dataset Assessment is provenance for this activity, but it is
  // still a dataset-assessment observation; the activity override value is not.
  const attributeEvidenceById = useMemo(() => {
    const previousAssessments = findPreviousAssessmentsForDataset({
      assessments: datasetAssessments,
      selectedDatasetId: datasetId,
      assessmentId: selectedDatasetAssessment?.id,
    });

    return buildAttributeEvidence({
      dataset: selectedDataset,
      previousAssessments: selectedDatasetAssessment
        ? [selectedDatasetAssessment, ...previousAssessments]
        : previousAssessments,
      scoringSystem,
    });
  }, [datasetAssessments, datasetId, scoringSystem, selectedDataset, selectedDatasetAssessment]);

  const originalAssessmentValuesByAttributeId = useMemo(
    () => buildOriginalAssessmentValueLookup(selectedDatasetAssessment),
    [selectedDatasetAssessment]
  );

  const mapDatasetAssessmentTables = useCallback(
    (datasetAssessment) => {
      if (!datasetAssessment) return [];

      return mapAssessmentTablesToFormState(datasetAssessment.tableAssessments, {
        datasetId: datasetAssessment.datasetId,
        sourceAssessmentId: datasetAssessment.id,
        datasetAttributeDataTypeLookup,
        datasetAttributeDisplayEvidenceLookup,
        assessmentAttributeLookup,
        isActivityOverride: false,
        scoringSystem: scoringSystemOf(datasetAssessment),
      });
    },
    [assessmentAttributeLookup, datasetAttributeDataTypeLookup, datasetAttributeDisplayEvidenceLookup]
  );

  const mapActivityOverrideTables = useCallback(
    (activity, datasetAssessment) =>
      mapAssessmentTablesToFormState(activity.tableAssessments, {
        datasetId: activity.datasetId,
        sourceAssessmentId: activity.datasetAssessmentId,
        datasetAttributeDataTypeLookup,
        datasetAttributeDisplayEvidenceLookup,
        assessmentAttributeLookup,
        isActivityOverride: true,
        scoringSystem: scoringSystemOf(datasetAssessment),
      }),
    [assessmentAttributeLookup, datasetAttributeDataTypeLookup, datasetAttributeDisplayEvidenceLookup]
  );

  // Fills metadata that was missing when the tables were mapped; returns the same array when
  // nothing changed.
  const reconcileTables = useCallback(
    (tables) => {
      if (!selectedDatasetAssessment) return tables;

      return reconcileTableReferences({
        tables,
        datasetId,
        datasetAssessmentId: selectedDatasetAssessment.id,
        datasetAttributeDataTypeLookup,
        datasetAttributeDisplayEvidenceLookup,
        assessmentAttributeLookup,
      });
    },
    [
      assessmentAttributeLookup,
      datasetAttributeDataTypeLookup,
      datasetAttributeDisplayEvidenceLookup,
      datasetId,
      selectedDatasetAssessment,
    ]
  );

  return {
    scoringSystem,
    attributeEvidenceById,
    originalAssessmentValuesByAttributeId,
    mapDatasetAssessmentTables,
    mapActivityOverrideTables,
    reconcileTables,
  };
}
