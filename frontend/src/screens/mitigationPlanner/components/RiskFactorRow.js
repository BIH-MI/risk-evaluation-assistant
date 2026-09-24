import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { IconButton, TableCell, TableRow } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import MitigationCardStack from "./MitigationCardStack";
import { driverCurrentState, driverTitle } from "../utils/mitigationPlanRows";
import {
  BODY_CELL_SX,
  CENTER_CELL_SX,
  RiskPriorityChip,
  mitigationControlsId,
  riskFactorId,
} from "./riskFactorTableHelpers";

function PossibleMitigationCell({ driver, actions, expanded, controlsId, onToggle }) {
  const { t } = useTranslation();

  if (actions.length === 0) {
    return (
      <RATypography variant="body2" textAlign="center" sx={{ color: "text.secondary" }}>
        {t("mitigationPlanner.factors.notApplicable", "N/A")}
      </RATypography>
    );
  }

  const title = driverTitle(driver);

  return (
    <RABox display="flex" justifyContent="center">
      <IconButton
        size="small"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={controlsId}
        aria-label={
          expanded
            ? t("mitigationPlanner.factors.hideMitigations", "Hide mitigations for {{title}}", { title })
            : t("mitigationPlanner.factors.showMitigations", "Show mitigations for {{title}}", { title })
        }
      >
        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </IconButton>
    </RABox>
  );
}

PossibleMitigationCell.propTypes = {
  driver: PropTypes.object.isRequired,
  actions: PropTypes.array.isRequired,
  expanded: PropTypes.bool.isRequired,
  controlsId: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default function RiskFactorRow({
  driver,
  actions,
  expanded,
  onToggleRiskFactor,
  selectedActionIds,
  parameterChoices,
  onToggleAction,
  onToggleDetails,
  onChooseParameter,
  expandedActionIds,
}) {
  const key = riskFactorId(driver);
  const currentAnswer = driverCurrentState(driver);

  return (
    <>
      <TableRow>
        <TableCell sx={CENTER_CELL_SX}>
          <RiskPriorityChip priority={driver.priority} />
        </TableCell>
        <TableCell sx={{ ...BODY_CELL_SX, overflowWrap: "anywhere" }}>{driverTitle(driver)}</TableCell>
        <TableCell sx={BODY_CELL_SX}>{currentAnswer}</TableCell>
        <TableCell sx={CENTER_CELL_SX}>
          <PossibleMitigationCell
            driver={driver}
            actions={actions}
            expanded={expanded}
            controlsId={mitigationControlsId(driver)}
            onToggle={onToggleRiskFactor}
          />
        </TableCell>
      </TableRow>
      <MitigationCardStack
        riskFactorKey={key}
        riskFactor={driver}
        actions={actions}
        expanded={expanded}
        selectedActionIds={selectedActionIds}
        parameterChoices={parameterChoices}
        onToggleAction={onToggleAction}
        onToggleDetails={onToggleDetails}
        onChooseParameter={onChooseParameter}
        expandedActionIds={expandedActionIds}
      />
    </>
  );
}

RiskFactorRow.propTypes = {
  driver: PropTypes.object.isRequired,
  actions: PropTypes.array.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggleRiskFactor: PropTypes.func.isRequired,
  selectedActionIds: PropTypes.array.isRequired,
  parameterChoices: PropTypes.object.isRequired,
  onToggleAction: PropTypes.func.isRequired,
  onToggleDetails: PropTypes.func.isRequired,
  onChooseParameter: PropTypes.func.isRequired,
  expandedActionIds: PropTypes.instanceOf(Set).isRequired,
};
