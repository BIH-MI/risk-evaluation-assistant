import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { ExpandableSection } from "./PlannerPrimitives";
import {
  formatAnswerImpact,
  formatDataType,
  formatRiskDriverPriority,
  formatRiskDriverSource,
} from "../utils/mitigationPlannerFormatters";
import {
  driverCurrentState,
  driverTitle,
  groupDriversByPriority,
  isEvidenceDriver,
} from "../utils/mitigationPlanRows";

const NO_ACTION_TEXT = "No configured mitigation action addresses this finding.";

function driverSourceLine(driver) {
  const source = isEvidenceDriver(driver) ? "Dataset Assessment evidence" : formatRiskDriverSource(driver.source);
  const detail = isEvidenceDriver(driver)
    ? [driver.tableName, driver.dataType && formatDataType(driver.dataType)]
    : [driver.categoryLabel];
  return [source, ...detail].filter(Boolean).join(" · ");
}

// The risk-driving answer and the proposed mitigation are different objects: actions are listed
// only when an explicit catalogue mapping exists.
function PossibleMitigations({ driver, actionsById }) {
  const actions = (driver.matchedMitigationActionIds || []).map((id) => actionsById.get(id)).filter(Boolean);
  if (actions.length === 0) {
    return (
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        {NO_ACTION_TEXT}
      </RATypography>
    );
  }
  return (
    <RABox display="flex" flexDirection="column" gap={0.25}>
      {actions.map((action) => (
        <RATypography key={action.actionId} variant="body2" fontWeight="bold">
          {action.actionName}
          {(action.addressedRiskDrivers || []).length > 1 && (
            <RATypography component="span" variant="caption" sx={{ color: "text.secondary", fontWeight: "normal" }}>
              {` · addresses ${action.addressedRiskDrivers.length} current findings`}
            </RATypography>
          )}
        </RATypography>
      ))}
    </RABox>
  );
}

PossibleMitigations.propTypes = {
  driver: PropTypes.object.isRequired,
  actionsById: PropTypes.instanceOf(Map).isRequired,
};

// High-risk triggers override normal category scoring, so each one gets its own prominent card.
function CriticalDriverCard({ driver, actionsById }) {
  const { t } = useTranslation();
  return (
    <RABox
      sx={{
        borderLeft: 4,
        borderColor: "error.main",
        bgcolor: "action.hover",
        borderRadius: 1,
        px: 2,
        py: 1.5,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2,
      }}
    >
      <RABox>
        <RABox display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
          <ReportProblemOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
          <RATypography variant="caption" fontWeight="bold" sx={{ color: "error.main", letterSpacing: 0.5 }}>
            {t("mitigationPlanner.drivers.critical", "CRITICAL RISK DRIVER")}
          </RATypography>
          {driver.highRiskTrigger && (
            <Chip size="small" color="error" variant="outlined" label={t("mitigationPlanner.drivers.trigger", "High-risk trigger")} />
          )}
        </RABox>
        <RATypography variant="body1" fontWeight="bold" sx={{ overflowWrap: "anywhere" }}>
          {driverTitle(driver)}
        </RATypography>
        <RATypography variant="body2">
          {t("mitigationPlanner.drivers.currentAnswer", "Current answer")}: <strong>{driverCurrentState(driver)}</strong>
        </RATypography>
        <RATypography variant="caption" display="block" sx={{ color: "text.secondary" }}>
          {driverSourceLine(driver)}
        </RATypography>
      </RABox>
      <RABox>
        <RATypography variant="caption" fontWeight="bold" display="block" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.drivers.possibleMitigation", "Possible mitigation")}
        </RATypography>
        <PossibleMitigations driver={driver} actionsById={actionsById} />
      </RABox>
    </RABox>
  );
}

CriticalDriverCard.propTypes = {
  driver: PropTypes.object.isRequired,
  actionsById: PropTypes.instanceOf(Map).isRequired,
};

function RiskDriverTable({ drivers, actionsById }) {
  const { t } = useTranslation();
  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 820 }} aria-label={t("mitigationPlanner.drivers.tableLabel", "Risk drivers")}>
        <TableHead>
          <TableRow>
            <TableCell>{t("mitigationPlanner.drivers.priority", "Priority")}</TableCell>
            <TableCell>{t("mitigationPlanner.drivers.finding", "Risk-driving finding")}</TableCell>
            <TableCell>{t("mitigationPlanner.drivers.current", "Current answer / classification")}</TableCell>
            <TableCell>{t("mitigationPlanner.drivers.effect", "Effect")}</TableCell>
            <TableCell>{t("mitigationPlanner.drivers.possibleMitigation", "Possible mitigation")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell>
                <Chip
                  size="small"
                  variant="outlined"
                  color={driver.priority === "HIGH" ? "warning" : "default"}
                  label={formatRiskDriverPriority(driver.priority)}
                />
              </TableCell>
              <TableCell>
                <RATypography variant="body2" fontWeight="bold" sx={{ overflowWrap: "anywhere" }}>
                  {driverTitle(driver)}
                </RATypography>
                <RATypography variant="caption" display="block" sx={{ color: "text.secondary" }}>
                  {driverSourceLine(driver)}
                </RATypography>
              </TableCell>
              <TableCell>{driverCurrentState(driver)}</TableCell>
              <TableCell>{driver.answerImpact ? formatAnswerImpact(driver.answerImpact) : "—"}</TableCell>
              <TableCell>
                <PossibleMitigations driver={driver} actionsById={actionsById} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

RiskDriverTable.propTypes = {
  drivers: PropTypes.array.isRequired,
  actionsById: PropTypes.instanceOf(Map).isRequired,
};

/**
 * Risk-driving findings of one side (data or context): critical high-risk triggers first, then
 * negative findings. Positive answers are not mitigation needs and are not listed.
 */
export default function RiskDriverSection({ drivers, actionRows }) {
  const { t } = useTranslation();
  const { critical, high, optional } = groupDriversByPriority(drivers);
  const actionsById = new Map(actionRows.map((row) => [row.actionId, row]));

  if (critical.length === 0 && high.length === 0 && optional.length === 0) {
    return (
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        {t("mitigationPlanner.drivers.none", "No risk-driving findings in this section.")}
      </RATypography>
    );
  }

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      {critical.length > 0 && (
        <RABox display="flex" flexDirection="column" gap={1}>
          <RATypography variant="subtitle2" fontWeight="bold">
            {t("mitigationPlanner.drivers.criticalTitle", "Critical — high-risk triggers")} ({critical.length})
          </RATypography>
          {critical.map((driver) => (
            <CriticalDriverCard key={driver.id} driver={driver} actionsById={actionsById} />
          ))}
        </RABox>
      )}
      {high.length > 0 && (
        <RABox display="flex" flexDirection="column" gap={1}>
          <RATypography variant="subtitle2" fontWeight="bold">
            {t("mitigationPlanner.drivers.highTitle", "High priority")} ({high.length})
          </RATypography>
          <RiskDriverTable drivers={high} actionsById={actionsById} />
        </RABox>
      )}
      {critical.length === 0 && high.length === 0 && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          {t("mitigationPlanner.drivers.noCriticalOrHigh", "No critical or high-priority findings in this section.")}
        </RATypography>
      )}
      {optional.length > 0 && (
        <ExpandableSection
          label={t("mitigationPlanner.drivers.optional", "Additional improvement opportunities ({{count}})", { count: optional.length })}
        >
          <RiskDriverTable drivers={optional} actionsById={actionsById} />
        </ExpandableSection>
      )}
    </RABox>
  );
}

RiskDriverSection.propTypes = {
  drivers: PropTypes.array,
  actionRows: PropTypes.array,
};

RiskDriverSection.defaultProps = {
  drivers: [],
  actionRows: [],
};
