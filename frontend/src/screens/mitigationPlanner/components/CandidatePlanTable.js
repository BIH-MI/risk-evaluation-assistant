import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
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

// Plan-level summary only; action evidence, question text and guidance stay in the action tables.
export default function CandidatePlanTable({ plans, selectedPlanKey, onSelect }) {
  const { t } = useTranslation();

  if (plans.length === 0) {
    return (
      <RATypography variant="body2" textAlign="center" sx={{ color: "text.secondary" }}>
        {t("mitigationPlanner.plans.empty", "No candidate plans yet. Select actions above and create a candidate plan.")}
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
            <TableCell>{t("mitigationPlanner.plans.actions", "Selected actions")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.cost", "Estimated cost")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.time", "Estimated setup")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.projectConstraints", "Project Constraints")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.nextStep", "Next step")}</TableCell>
            <TableCell padding="checkbox">{t("mitigationPlanner.plans.select", "Select")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plans.map(({ key, label, evaluation }) => {
            return (
              <TableRow key={key} hover selected={key === selectedPlanKey} onClick={() => onSelect(key)} sx={{ cursor: "pointer" }}>
                <TableCell>
                  <RATypography variant="body2" fontWeight="bold">
                    {label}
                  </RATypography>
                </TableCell>
                <TableCell>{formatStrategy(evaluation.strategy)}</TableCell>
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
};

CandidatePlanTable.defaultProps = { selectedPlanKey: null };
