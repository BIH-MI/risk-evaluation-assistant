import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Chip, Tooltip } from "@mui/material";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatAttributeRole, formatDataType } from "../utils/mitigationPlannerFormatters";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function DataEvidenceLine({ action }) {
  const { t } = useTranslation();
  const targets = action.matchedTargets || [];
  const attributeNames = unique(targets.flatMap((target) => target.attributeNames || []));
  const qualifiers = unique(
    targets.flatMap((target) => [formatAttributeRole(target.attributeRole), formatDataType(target.dataType)])
  );

  if (attributeNames.length === 0 && qualifiers.length === 0) return null;

  return (
    <RABox display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
      <Tooltip title={t("mitigationPlanner.actions.applicableEvidence", "Applicable dataset evidence")}>
        <DataObjectRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </Tooltip>
      {attributeNames.length > 0 && (
        <RATypography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
          {attributeNames.join(" · ")}
        </RATypography>
      )}
      {qualifiers.map((qualifier) => (
        <Chip
          key={qualifier}
          size="small"
          variant="outlined"
          label={qualifier}
          sx={{ height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.75 } }}
        />
      ))}
    </RABox>
  );
}

DataEvidenceLine.propTypes = { action: PropTypes.object.isRequired };

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
  return action.group === "DATA" || action.actionType === "DATA_TRANSFORMATION" ? (
    <DataEvidenceLine action={action} />
  ) : (
    <ContextEvidenceLine action={action} riskFactor={riskFactor} />
  );
}

MitigationEvidenceLine.propTypes = {
  action: PropTypes.object.isRequired,
  riskFactor: PropTypes.object.isRequired,
};
