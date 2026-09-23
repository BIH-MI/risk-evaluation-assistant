import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Chip } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

// Traceability from selected actions to the in-memory questionnaire changes that produced the
// counterfactual result. The stored Recipient Assessment is unchanged.
export default function AppliedQuestionChanges({ changes }) {
  const { t } = useTranslation();
  if (changes.length === 0) return null;

  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={1}>
        {t("mitigationPlanner.changes.title", "Applied Questionnaire Changes")}
      </RATypography>
      <RABox display="flex" flexDirection="column" gap={1.5}>
        {changes.map((change) => (
          <RABox key={`${change.frameworkName}:${change.questionCode}`}>
            <RABox display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <RATypography variant="body2" fontWeight="bold">
                {change.actionNames.join(", ")}
              </RATypography>
              {change.highRiskTriggerRemoved && (
                <Chip size="small" color="error" variant="outlined" label={t("mitigationPlanner.changes.triggerAddressed", "High-risk trigger addressed")} />
              )}
              {change.negativeFindingAddressed && (
                <Chip size="small" color="warning" variant="outlined" label={t("mitigationPlanner.changes.negativeAddressed", "Negative finding addressed")} />
              )}
            </RABox>
            <RATypography variant="body2" sx={{ color: "text.secondary" }}>
              {change.questionText}
              {change.frameworkName ? ` (${change.frameworkName})` : ""}
            </RATypography>
            <RABox display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <RATypography variant="body2">
                {t("mitigationPlanner.changes.current", "Current")}: <strong>{change.currentOptionText}</strong>
              </RATypography>
              <ArrowForwardIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <RATypography variant="body2">
                {t("mitigationPlanner.changes.afterVerified", "After verified implementation")}: <strong>{change.projectedOptionText}</strong>
              </RATypography>
            </RABox>
          </RABox>
        ))}
      </RABox>
    </RABox>
  );
}

AppliedQuestionChanges.propTypes = {
  changes: PropTypes.arrayOf(
    PropTypes.shape({
      actionNames: PropTypes.arrayOf(PropTypes.string),
      frameworkName: PropTypes.string,
      questionCode: PropTypes.string,
      questionText: PropTypes.string,
      currentOptionText: PropTypes.string,
      projectedOptionText: PropTypes.string,
      highRiskTriggerRemoved: PropTypes.bool,
      negativeFindingAddressed: PropTypes.bool,
    })
  ),
};

AppliedQuestionChanges.defaultProps = { changes: [] };
