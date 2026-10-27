import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import DatasetTablesAssessment from "components/display/Tables/DataTable/CustomDataTableComponents/DatasetTablesAssessment";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import PreviousAssessmentSection from "./PreviousAssessmentSection";
import { buildAttributeEvidence } from "../evidence/buildAttributeEvidence";
import { applyPreviousAssessmentValues } from "../evidence/previousAssessmentEvidence";

function AttributeRiskAssessmentSection({
  dataset,
  previousAssessments,
  tables,
  setTables,
  scoringSystem,
  isReadOnly,
}) {
  const { t } = useTranslation();
  const [selectedPreviousAssessmentId, setSelectedPreviousAssessmentId] =
    useState("");
  const firstPreviousAssessmentId =
    previousAssessments?.[0]?.id !== undefined &&
    previousAssessments?.[0]?.id !== null
      ? String(previousAssessments[0].id)
      : "";
  const selectedPreviousAssessmentIdIsAvailable = (
    previousAssessments || []
  ).some(
    (assessment) =>
      String(assessment.id) === String(selectedPreviousAssessmentId)
  );
  const effectiveSelectedPreviousAssessmentId =
    selectedPreviousAssessmentIdIsAvailable
      ? String(selectedPreviousAssessmentId)
      : firstPreviousAssessmentId;

  const selectedPreviousAssessment = useMemo(
    () =>
      (previousAssessments || []).find(
        (assessment) =>
          String(assessment.id) === effectiveSelectedPreviousAssessmentId
      ) || null,
    [effectiveSelectedPreviousAssessmentId, previousAssessments]
  );

  const attributeEvidenceById = useMemo(
    () =>
      buildAttributeEvidence({
        dataset,
        previousAssessments,
        scoringSystem,
      }),
    [dataset, previousAssessments, scoringSystem]
  );

  useEffect(() => {
    if (
      selectedPreviousAssessmentId === effectiveSelectedPreviousAssessmentId
    ) {
      return;
    }

    setSelectedPreviousAssessmentId(effectiveSelectedPreviousAssessmentId);
  }, [effectiveSelectedPreviousAssessmentId, selectedPreviousAssessmentId]);

  const handleApplyAssessment = useCallback(() => {
    if (!selectedPreviousAssessment) return;

    setTables((currentTables) =>
      applyPreviousAssessmentValues({
        tables: currentTables,
        sourceAssessment: selectedPreviousAssessment,
        scoringSystem,
      })
    );
  }, [scoringSystem, selectedPreviousAssessment, setTables]);

  return (
    <RABox>
      <RATypography variant="h6" align="center" mb={2}>
        {t("datasetAssessments.form.attributeRiskAssessment")}
      </RATypography>

      <PreviousAssessmentSection
        previousAssessments={previousAssessments}
        selectedAssessmentId={effectiveSelectedPreviousAssessmentId}
        onSelectedAssessmentIdChange={setSelectedPreviousAssessmentId}
        scoringSystem={scoringSystem}
        isReadOnly={isReadOnly}
        onApplyAssessment={handleApplyAssessment}
      />

      <DatasetTablesAssessment
        tables={tables}
        setTables={setTables}
        isReadOnly={isReadOnly}
        scoringSystem={scoringSystem}
        attributeEvidenceById={attributeEvidenceById}
      />
    </RABox>
  );
}

export default AttributeRiskAssessmentSection;
