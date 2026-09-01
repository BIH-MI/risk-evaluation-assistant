import React, { useMemo } from "react";
import { MenuItem } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAButton from "components/input/RAButton";
import RAInput from "components/input/RAInput";
import {
  getPreviousAssessmentOptionLabel,
  isAssessmentScoringSystemCompatible,
} from "../evidence/previousAssessmentEvidence";

/**
 * Historical assessments are retrieved by dataset rather than configuration;
 * scoring-system compatibility only determines whether their values can be
 * copied directly into the current assessment.
 */
function PreviousAssessmentSection({
  previousAssessments = [],
  selectedAssessmentId,
  onSelectedAssessmentIdChange,
  scoringSystem,
  isReadOnly,
  onApplyAssessment,
}) {
  const { t } = useTranslation();
  const selectedAssessment = useMemo(
    () =>
      previousAssessments.find(
        (assessment) => String(assessment.id) === String(selectedAssessmentId)
      ) || null,
    [previousAssessments, selectedAssessmentId]
  );
  const selectedAssessmentCompatible = isAssessmentScoringSystemCompatible(
    selectedAssessment,
    scoringSystem
  );

  if (!previousAssessments.length) {
    return null;
  }

  return (
    <RABox
      mb={3}
      display="flex"
      justifyContent="center"
      alignItems="flex-end"
      gap={2}
      flexWrap="wrap"
    >
      <RABox
        sx={{
          flex: "0 1 520px",
          minWidth: { xs: 260, sm: 320 },
          maxWidth: "100%",
        }}
      >
        <RATypography variant="caption" fontWeight="medium" display="block">
          {t(
            "datasetAssessments.previousAssessments.label",
            "Previous assessment"
          )}
        </RATypography>
        <RAInput
          select
          size="small"
          value={selectedAssessmentId || ""}
          onChange={(event) => onSelectedAssessmentIdChange(event.target.value)}
          fullWidth
        >
          {previousAssessments.map((assessment) => (
            <MenuItem key={assessment.id} value={String(assessment.id)}>
              <RATypography variant="body2" noWrap>
                {getPreviousAssessmentOptionLabel(assessment)}
              </RATypography>
            </MenuItem>
          ))}
        </RAInput>
      </RABox>

      {selectedAssessment && (
        <RAButton
          variant="outlined"
          color="primary"
          onClick={onApplyAssessment}
          disabled={isReadOnly || !selectedAssessmentCompatible}
          sx={{
            minWidth: 112,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <DownloadIcon fontSize="small" />
          <RATypography variant="caption">
            {t(
              "datasetAssessments.previousAssessments.applyValues",
              "Apply"
            )}
          </RATypography>
        </RAButton>
      )}
    </RABox>
  );
}

export default PreviousAssessmentSection;
