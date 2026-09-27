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

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { EstimateText } from "./PlannerPrimitives";
import ProjectConstraintChip from "./ProjectConstraintChip";
import { formatPlanCost, formatPlanSetup, formatStrategy } from "../utils/mitigationPlannerFormatters";

/**
 * Compact comparison of plans: the backend's generated plans in backend order (Recommended Plan
 * first, then alternatives), followed by the researcher's Custom Plan when one was evaluated. The
 * Custom Plan is never ranked. Actions, Risk Driver links and follow-up detail live in the
 * Assessment Report of the selected plan.
 */
export default function CandidatePlanTable({ plans, selectedPlanKey, onSelect }) {
  const { t } = useTranslation();

  return (
    <TableContainer sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{ minWidth: 640 }} aria-label={t("mitigationPlanner.plans.title", "Candidate mitigation plans")}>
        <TableHead>
          <TableRow>
            <TableCell>{t("mitigationPlanner.plans.plan", "Plan")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.strategy", "Strategy")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.cost", "Estimated cost")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.time", "Estimated setup")}</TableCell>
            <TableCell>{t("mitigationPlanner.plans.projectConstraints", "Project Constraints")}</TableCell>
            <TableCell padding="checkbox">{t("mitigationPlanner.plans.select", "Select")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {plans.map(({ key, label, recommended, evaluation }) => (
            <TableRow key={key} hover selected={key === selectedPlanKey} onClick={() => onSelect(key)} sx={{ cursor: "pointer" }}>
              <TableCell>
                <RABox display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
                  <RATypography variant="body2" fontWeight="bold">
                    {label}
                  </RATypography>
                  {recommended && (
                    <Chip size="small" color="primary" label={t("mitigationPlanner.plans.recommended", "Recommended")} />
                  )}
                </RABox>
              </TableCell>
              <TableCell>{formatStrategy(evaluation.strategy)}</TableCell>
              <TableCell><EstimateText text={formatPlanCost(evaluation.costEstimate)} /></TableCell>
              <TableCell><EstimateText text={formatPlanSetup(evaluation.setupEstimate)} /></TableCell>
              <TableCell>
                <ProjectConstraintChip result={evaluation.projectConstraintResult} />
              </TableCell>
              <TableCell padding="checkbox">
                <Radio
                  checked={key === selectedPlanKey}
                  onChange={() => onSelect(key)}
                  inputProps={{ "aria-label": `${t("mitigationPlanner.plans.select", "Select plan")} ${label}` }}
                />
              </TableCell>
            </TableRow>
          ))}
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
