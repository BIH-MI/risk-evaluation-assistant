import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@mui/material";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

function contextTransition(action, riskFactor) {
  const match = (action.matchedFindings || []).find(
    (finding) =>
      finding.questionCode === riskFactor.questionCode ||
      finding.currentOptionCode === riskFactor.selectedOptionCode ||
      finding.currentOptionText === riskFactor.selectedOptionText
  );
  const current = riskFactor.selectedOptionText || match?.currentOptionText;
  const projected = match?.potentialOptionText;
  return current && projected ? `${current} \u2192 ${projected}` : "";
}

function ContextEvidenceLine({ action, riskFactor }) {
  const { t } = useTranslation();
  const transition = contextTransition(action, riskFactor);
  if (!transition) return null;

  return (
    <RABox display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
      <Tooltip title={t("mitigationPlanner.actions.currentProjected", "Current to projected answer")}>
        <FactCheckRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </Tooltip>
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        {transition}
      </RATypography>
    </RABox>
  );
}

ContextEvidenceLine.propTypes = {
  action: PropTypes.object.isRequired,
  riskFactor: PropTypes.object.isRequired,
};

export default function MitigationEvidenceLine({ action, riskFactor }) {
  if (action.group === "DATA" || action.actionType === "DATA_TRANSFORMATION") return null;
  return <ContextEvidenceLine action={action} riskFactor={riskFactor} />;
}

MitigationEvidenceLine.propTypes = {
  action: PropTypes.object.isRequired,
  riskFactor: PropTypes.object.isRequired,
};
