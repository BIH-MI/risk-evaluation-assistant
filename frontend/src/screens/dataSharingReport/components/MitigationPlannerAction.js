import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SecurityIcon from "@mui/icons-material/Security";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import { getManualRiskThresholdForPayload } from "../reportDataUtils";

/**
 * Navigation to the Mitigation Planner. It is not report content, so the caller must not
 * render it while the report is being exported.
 */
export default function MitigationPlannerAction({
  activity,
  isThresholdOverwritten,
  manualRiskThreshold,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasProject = Boolean(activity?.projectId);

  const handleOpen = () => {
    // The effective target threshold is handed over explicitly so the planner baseline matches
    // the Risk Analysis Summary the user is looking at.
    const manualThreshold = getManualRiskThresholdForPayload({
      isThresholdOverwritten,
      manualRiskThreshold,
    });
    const query =
      manualThreshold === null
        ? ""
        : `?manualRiskThreshold=${encodeURIComponent(manualThreshold)}`;
    navigate(`/data-sharing-activities/${activity.id}/mitigation-planner${query}`);
  };

  const button = (
    <RAButton
      variant="outlined"
      startIcon={<SecurityIcon />}
      disabled={!hasProject}
      onClick={handleOpen}
    >
      {t("report.openMitigationPlanner", "Open Mitigation Planner")}
    </RAButton>
  );

  return (
    <RABox display="flex" justifyContent="center">
      {hasProject ? (
        button
      ) : (
        <RequirementHelpTooltip
          title={t(
            "report.mitigationPlannerNeedsProject",
            "A Project is required before mitigation planning can be performed."
          )}
        >
          {/* The span keeps the tooltip working while the button is disabled. */}
          <span>{button}</span>
        </RequirementHelpTooltip>
      )}
    </RABox>
  );
}

MitigationPlannerAction.propTypes = {
  activity: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    projectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  isThresholdOverwritten: PropTypes.bool,
  manualRiskThreshold: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

MitigationPlannerAction.defaultProps = {
  activity: null,
  isThresholdOverwritten: false,
  manualRiskThreshold: "",
};
