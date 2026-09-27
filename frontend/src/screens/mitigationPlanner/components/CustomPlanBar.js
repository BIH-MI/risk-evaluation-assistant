import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";

/**
 * Centred actions for the researcher's Custom Plan, hidden until at least one mitigation is ticked.
 * Evaluate stays disabled while a selected action has an incomplete required parameter; the
 * tooltip names the action and field, and the card itself marks the missing value. Evaluation uses
 * the same backend evaluator as generated plans and never changes the Recommended Plan.
 */
export default function CustomPlanBar({ selectedCount, canEvaluate, issues, evaluating, onEvaluate, onClear }) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;

  const evaluateButton = (
    <RAButton
      variant="contained"
      color="primary"
      disabled={!canEvaluate || evaluating}
      onClick={onEvaluate}
      startIcon={evaluating ? <CircularProgress size={16} /> : null}
    >
      {t("mitigationPlanner.custom.evaluate", "Evaluate Custom Plan")}
    </RAButton>
  );

  return (
    <RABox display="flex" justifyContent="center" alignItems="center" flexWrap="wrap" gap={1}>
      {issues.length > 0 ? (
        <RequirementHelpTooltip
          title={[
            t("mitigationPlanner.custom.incomplete", "Select all required mitigation parameters first."),
            ...issues.map((issue) => `• ${issue.message}`),
          ].join("\n")}
        >
          {/* Disabled buttons emit no events; the span lets the tooltip explain why. */}
          <span>{evaluateButton}</span>
        </RequirementHelpTooltip>
      ) : (
        evaluateButton
      )}
      <RAButton variant="outlined" color="secondary" disabled={evaluating} onClick={onClear}>
        {t("mitigationPlanner.custom.clear", "Clear")}
      </RAButton>
    </RABox>
  );
}

CustomPlanBar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  canEvaluate: PropTypes.bool.isRequired,
  issues: PropTypes.arrayOf(PropTypes.shape({ message: PropTypes.string })).isRequired,
  evaluating: PropTypes.bool.isRequired,
  onEvaluate: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};
