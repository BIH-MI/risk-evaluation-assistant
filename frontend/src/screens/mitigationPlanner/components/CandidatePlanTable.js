import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  Chip,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import RATypography from "components/display/RATypography";
import { EstimateText } from "./PlannerPrimitives";
import ProjectConstraintChip from "./ProjectConstraintChip";
import {
  formatPlanActions,
  formatPlanCost,
  formatPlanSetup,
  formatStrategy,
} from "../utils/mitigationPlannerFormatters";

function formatCoverage(covered, total) {
  return total ? `${covered ?? 0}/${total}` : "—";
}

// Plan-level summary only; action evidence, question text and guidance stay in the action tables.
// Generated plans (recommended/alternatives) and optional manual plans share this table.
export default function CandidatePlanTable({ plans, selectedPlanKey, onSelect, coverageTotals }) {
  const { t } = useTranslation();

  if (plans.length === 0) {
    return (
      <RATypography variant="body2" textAlign="center" sx={{ color: "text.secondary" }}>
        {t("mitigationPlanner.plans.empty", "No candidate plans yet. Generate plans to see the recommended plan and alternatives.")}
      </RATypography>
    );
  }

  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 1000 }} aria-label={t("mitigationPlanner.plans.title", "Candidate mitigation plans")}>
        <TableHead>
          <TableRow>
            <TableCell>{t("mitigationPlanner.plans.plan", "Plan")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.strategy", "Strategy")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.coverage", "Critical / High drivers covered")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.actions", "Selected actions")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.cost", "Estimated cost")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.time", "Estimated setup")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.projectConstraints", "Project Constraints")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.nextStep", "Next step")}</TableCell>
            <TableCell padding="checkbox">{t("mitigationPlanner.plans.select", "Select")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plans.map(({ key, label, source, evaluation, criticalDriverCoverage, highDriverCoverage }) => {
            return (
              <TableRow key={key} hover selected={key === selectedPlanKey} onClick={() => onSelect(key)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <RATypography variant="body2" fontWeight="bold">
                    {label}
                  </RATypography>
                  {source === "RECOMMENDED" && (
                    <Chip size="small" color="primary" label={t("mitigationPlanner.plans.recommended", "Recommended")} />
                  )}
                </TableCell>
                <TableCell>{formatStrategy(evaluation.strategy)}</TableCell>
                <TableCell>
                  {source === "MANUAL"
                    ? "—"
                    : `${formatCoverage(criticalDriverCoverage, coverageTotals.critical)} · ${formatCoverage(highDriverCoverage, coverageTotals.high)}`}
                </TableCell>
                <TableCell>
                  {formatPlanActions(evaluation.actions).map((actionText, index) => (
                    <RATypography key={`${key}:action:${index}`} variant="body2">
                      {actionText}
                    </RATypography>
                  ))}
                </TableCell>
                <TableCell><EstimateText text={formatPlanCost(evaluation.costEstimate)} /></TableCell>
                <TableCell><EstimateText text={formatPlanSetup(evaluation.setupEstimate)} /></TableCell>
                <TableCell>
                  <ProjectConstraintChip result={evaluation.projectConstraintResult} />
                </TableCell>
                <TableCell>{evaluation.nextStep || "—"}</TableCell>
                <TableCell padding="checkbox">
                  <Radio
                    checked={key === selectedPlanKey}
                    onChange={() => onSelect(key)}
                    inputProps={{ "aria-label": `${t("mitigationPlanner.plans.select", "Select plan")} ${label}` }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

CandidatePlanTable.propTypes = {
  plans: PropTypes.array.isRequired,
  selectedPlanKey: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  coverageTotals: PropTypes.shape({ critical: PropTypes.number, high: PropTypes.number }),
};

CandidatePlanTable.defaultProps = { selectedPlanKey: null, coverageTotals: { critical: 0, high: 0 } };
