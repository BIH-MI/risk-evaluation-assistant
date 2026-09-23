import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { SectionLabel } from "./PlannerPrimitives";

// Each finding is an explicit catalogue mapping: the current answer triggers the action and the
// projected answer is used only in an in-memory what-if. The stored assessment never changes.
export default function ContextFindingSummary({ findings }) {
  const { t } = useTranslation();
  if (findings.length === 0) return null;

  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <SectionLabel>{t("mitigationPlanner.details.questions", "Mapped assessment questions")}</SectionLabel>
      {findings.map((finding) => (
        <RABox key={`${finding.frameworkName}:${finding.questionCode}`}>
          <RATypography variant="body2">
            {finding.questionText}
            {finding.frameworkName && (
              <RATypography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                {` (${finding.frameworkName})`}
              </RATypography>
            )}
          </RATypography>
          <RABox display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <RATypography variant="body2">
              {t("mitigationPlanner.details.current", "Current")}: <strong>{finding.currentOptionText || "—"}</strong>
            </RATypography>
            <ArrowForwardIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <RATypography variant="body2">
              {t("mitigationPlanner.details.afterVerified", "After verified implementation")}:{" "}
              <strong>{finding.potentialOptionText || "—"}</strong>
            </RATypography>
          </RABox>
        </RABox>
      ))}
    </RABox>
  );
}

ContextFindingSummary.propTypes = {
  findings: PropTypes.arrayOf(
    PropTypes.shape({
      frameworkName: PropTypes.string,
      questionCode: PropTypes.string,
      questionText: PropTypes.string,
      currentOptionText: PropTypes.string,
      potentialOptionText: PropTypes.string,
    })
  ).isRequired,
};
