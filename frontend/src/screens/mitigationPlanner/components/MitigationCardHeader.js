import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Checkbox, Tooltip } from "@mui/material";
import EuroRoundedIcon from "@mui/icons-material/EuroRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  NOT_AVAILABLE,
  formatActionType,
  formatCostEstimate,
  formatSetupEstimate,
} from "../utils/mitigationPlannerFormatters";

function ActionIcon({ actionType }) {
  const label = formatActionType(actionType);
  const Icon = actionType === "CONTEXT_CONTROL" ? SecurityRoundedIcon : TuneRoundedIcon;

  return (
    <Tooltip title={label}>
      <RABox
        sx={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
          color: "text.secondary",
          flexShrink: 0,
        }}
      >
        <Icon fontSize="small" />
      </RABox>
    </Tooltip>
  );
}

ActionIcon.propTypes = { actionType: PropTypes.string };
ActionIcon.defaultProps = { actionType: null };

function CompactMetric({ icon, tooltip, value }) {
  const muted = value === NOT_AVAILABLE;

  return (
    <Tooltip title={tooltip}>
      <RABox display="flex" alignItems="center" gap={0.5} sx={{ color: muted ? "text.secondary" : "text.primary" }}>
        {icon}
        <RATypography variant="body2" fontWeight={muted ? "regular" : "medium"} sx={{ whiteSpace: "nowrap" }}>
          {value}
        </RATypography>
      </RABox>
    </Tooltip>
  );
}

CompactMetric.propTypes = {
  icon: PropTypes.node.isRequired,
  tooltip: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export default function MitigationCardHeader({ action, selected, onToggleAction }) {
  const { t } = useTranslation();
  const cost = formatCostEstimate(action.estimate);
  const setup = formatSetupEstimate(action.estimate);

  return (
    <RABox display="flex" alignItems="center" justifyContent="space-between" gap={1.5} flexWrap="wrap">
      <RABox display="flex" alignItems="center" gap={1} minWidth={0} flex={1}>
        <ActionIcon actionType={action.actionType} />
        <RATypography variant="body2" fontWeight="bold" sx={{ overflowWrap: "anywhere" }}>
          {action.actionName}
        </RATypography>
      </RABox>
      <RABox display="flex" alignItems="center" gap={{ xs: 1.25, md: 2 }} ml="auto">
        <CompactMetric
          icon={<EuroRoundedIcon fontSize="small" />}
          tooltip={t("mitigationPlanner.actions.estimatedCost", "Estimated implementation cost")}
          value={cost}
        />
        <CompactMetric
          icon={<ScheduleRoundedIcon fontSize="small" />}
          tooltip={t("mitigationPlanner.actions.estimatedSetup", "Estimated setup time")}
          value={setup}
        />
        <Tooltip title={t("mitigationPlanner.actions.includeInPlan", "Include in candidate mitigation plan")}>
          <Checkbox
            checked={selected}
            onChange={() => onToggleAction(action.actionId)}
            inputProps={{
              "aria-label": t("mitigationPlanner.actions.selectAction", "Select {{name}}", {
                name: action.actionName,
              }),
            }}
            sx={{ p: 0.5 }}
          />
        </Tooltip>
      </RABox>
    </RABox>
  );
}

MitigationCardHeader.propTypes = {
  action: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  onToggleAction: PropTypes.func.isRequired,
};
