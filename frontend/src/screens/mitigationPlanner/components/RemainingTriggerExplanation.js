import PropTypes from "prop-types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatCategoryOutcome } from "../utils/mitigationPlannerFormatters";

/**
 * Explains why a context category did not move in the counterfactual result, from backend
 * diagnostics of the projected answers. Remaining high-risk triggers are named, because the
 * engine keeps a category in its override band while any trigger stays selected.
 */
export default function RemainingTriggerExplanation({ outcomes, remainingTriggers }) {
  const unchanged = outcomes.filter((outcome) => outcome.reason !== "BAND_CHANGED");
  if (unchanged.length === 0) return null;

  return (
    <RABox display="flex" alignItems="flex-start" gap={1}>
      <InfoOutlinedIcon fontSize="small" sx={{ color: "info.main", mt: 0.25 }} />
      <RABox display="flex" flexDirection="column" gap={1}>
        {unchanged.map((outcome) => {
          const triggers = remainingTriggers.filter((trigger) => trigger.categoryCode === outcome.categoryCode);
          return (
            <RABox key={outcome.categoryCode}>
              <RATypography variant="body2">{formatCategoryOutcome(outcome)}</RATypography>
              {outcome.reason === "HIGH_RISK_TRIGGERS_REMAIN" && triggers.length > 0 && (
                <RABox component="ul" sx={{ my: 0.5, pl: 3 }}>
                  {triggers.map((trigger) => (
                    <li key={trigger.questionCode}>
                      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
                        {trigger.questionText} — {trigger.selectedOptionText}
                      </RATypography>
                    </li>
                  ))}
                </RABox>
              )}
            </RABox>
          );
        })}
      </RABox>
    </RABox>
  );
}

RemainingTriggerExplanation.propTypes = {
  outcomes: PropTypes.arrayOf(
    PropTypes.shape({
      categoryCode: PropTypes.string,
      reason: PropTypes.string,
    })
  ),
  remainingTriggers: PropTypes.arrayOf(
    PropTypes.shape({
      categoryCode: PropTypes.string,
      questionCode: PropTypes.string,
      questionText: PropTypes.string,
      selectedOptionText: PropTypes.string,
    })
  ),
};

RemainingTriggerExplanation.defaultProps = { outcomes: [], remainingTriggers: [] };
