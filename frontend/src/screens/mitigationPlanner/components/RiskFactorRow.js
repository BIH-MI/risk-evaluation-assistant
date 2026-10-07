import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { IconButton, TableCell, TableRow } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import MitigationCardStack from "./MitigationCardStack";
import { driverCurrentState, driverTitle, isDatasetEvidenceDriver } from "../utils/mitigationPlanRows";
import { formatDataType, formatNumericEvidence } from "../utils/mitigationPlannerFormatters";
import {
  BODY_CELL_SX,
  CENTER_CELL_SX,
  RiskPriorityChip,
  mitigationControlsId,
  riskFactorId,
} from "./riskFactorTableHelpers";

function formattedEvidenceValue(value) {
  return formatNumericEvidence(value);
}

function hasEvidenceValue(value) {
  return formattedEvidenceValue(value) !== "";
}

function EvidenceLine({ label, value }) {
  if (!value) return null;
  return (
    <RATypography variant="caption" component="div" color="inherit">
      <strong>{label}:</strong> {value}
    </RATypography>
  );
}

EvidenceLine.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
};

EvidenceLine.defaultProps = { value: "" };

function qidScoreExpression(driver) {
  const score = formattedEvidenceValue(driver.qidScore);
  const hasRadParts =
    hasEvidenceValue(driver.replicability) &&
    hasEvidenceValue(driver.availability) &&
    hasEvidenceValue(driver.distinguishability);
  if (!score) return "";
  if (!hasRadParts) return score;
  return `${formattedEvidenceValue(driver.replicability)} + ${formattedEvidenceValue(driver.availability)} + ${formattedEvidenceValue(driver.distinguishability)} = ${score}`;
}

function PotentialQidEvidenceTooltip({ driver }) {
  const { t } = useTranslation();
  const score = qidScoreExpression(driver);
  const threshold = formattedEvidenceValue(driver.qidThreshold);

  return (
    <RABox display="flex" flexDirection="column" gap={0.5}>
      <RATypography variant="caption" color="inherit" sx={{ fontWeight: 700 }}>
        {t("mitigationPlanner.classificationEvidence.potentialQidTitle", "Potential QID evidence")}
      </RATypography>
      <EvidenceLine
        label={t("mitigationPlanner.classificationEvidence.qidScore", "R + A + D")}
        value={score}
      />
      <EvidenceLine
        label={t("mitigationPlanner.classificationEvidence.identifiabilityThreshold", "Identifiability threshold")}
        value={threshold}
      />
    </RABox>
  );
}

PotentialQidEvidenceTooltip.propTypes = { driver: PropTypes.object.isRequired };

function hasPotentialQidTooltip(driver) {
  return Boolean(
    hasEvidenceValue(driver?.qidScore) ||
      hasEvidenceValue(driver?.qidThreshold)
  );
}

function CurrentClassificationCell({ driver }) {
  const { t } = useTranslation();
  const currentAnswer = driverCurrentState(driver);
  const showPotentialQidTooltip =
    isDatasetEvidenceDriver(driver) &&
    driver.attributeRole === "CANDIDATE_QID" &&
    hasPotentialQidTooltip(driver);

  if (!showPotentialQidTooltip) return currentAnswer;

  return (
    <RABox display="flex" alignItems="center" gap={0.5}>
      <RATypography variant="body2">{currentAnswer}</RATypography>
      <RequirementHelpTooltip title={<PotentialQidEvidenceTooltip driver={driver} />}>
        <InfoOutlinedIcon
          fontSize="small"
          tabIndex={0}
          aria-label={t("mitigationPlanner.classificationEvidence.infoAriaLabel", "Potential QID evidence")}
          aria-hidden={false}
          sx={{ color: "text.secondary", cursor: "help" }}
        />
      </RequirementHelpTooltip>
    </RABox>
  );
}

CurrentClassificationCell.propTypes = { driver: PropTypes.object.isRequired };

function PossibleMitigationCell({ driver, actions, expanded, controlsId, onToggle }) {
  const { t } = useTranslation();

  if (actions.length === 0) {
    return (
      <RATypography variant="caption" textAlign="center" display="block" sx={{ color: "text.secondary" }}>
        {t(
          "mitigationPlanner.factors.noConfiguredAction",
          "No configured mitigation option applies to this finding under the Project's sharing model. It remains part of the risk result."
        )}
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
  showDataType,
  columnCount,
}) {
  const key = riskFactorId(driver);

  return (
    <>
      <TableRow>
        <TableCell sx={CENTER_CELL_SX}>
          <RiskPriorityChip priority={driver.priority} />
        </TableCell>
        <TableCell sx={{ ...BODY_CELL_SX, overflowWrap: "anywhere" }}>{driverTitle(driver)}</TableCell>
        {showDataType && (
          <TableCell sx={BODY_CELL_SX}>{formatDataType(driver.dataType) || "—"}</TableCell>
        )}
        <TableCell sx={BODY_CELL_SX}>
          <CurrentClassificationCell driver={driver} />
        </TableCell>
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
        columnCount={columnCount}
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
  // Adds the action to the Custom Plan; when omitted the action is shown read-only.
  onToggleAction: PropTypes.func,
  onToggleDetails: PropTypes.func.isRequired,
  onChooseParameter: PropTypes.func.isRequired,
  expandedActionIds: PropTypes.instanceOf(Set).isRequired,
  showDataType: PropTypes.bool,
  columnCount: PropTypes.number.isRequired,
};

RiskFactorRow.defaultProps = { onToggleAction: null, showDataType: false };
