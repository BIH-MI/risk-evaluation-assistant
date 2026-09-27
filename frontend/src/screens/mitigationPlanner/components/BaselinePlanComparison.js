import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatPercentageValue } from "screens/dataSharingReport/reportDataUtils";

function contextChangeTone(baseline, projected) {
  if (baseline?.attackProbability == null || projected?.attackProbability == null) return null;
  if (projected.attackProbability < baseline.attackProbability) return "success.main";
  if (projected.attackProbability > baseline.attackProbability) return "error.main";
  return null;
}

/**
 * Baseline versus the counterfactual context of the selected plan. Every value is a backend result
 * of RiskComputationService; a value is highlighted only when it actually differs.
 */
export default function BaselinePlanComparison({ context, planLabel }) {
  const { t } = useTranslation();
  const { baseline, projected } = context;
  const changeTone = contextChangeTone(baseline, projected);
  const rows = [
    // Context-only what-ifs keep Impact and T fixed, so both columns share one value.
    { key: "impact", label: t("mitigationPlanner.risk.impact", "Impact"), before: context.impactBand, after: context.impactBand },
    {
      key: "t",
      label: t("mitigationPlanner.risk.targetThreshold", "Overall target threshold T"),
      before: formatPercentageValue(context.targetThreshold),
      after: formatPercentageValue(context.targetThreshold),
    },
    { key: "controls", label: t("mitigationPlanner.risk.controls", "Controls"), before: baseline.controlsBand, after: projected.controlsBand },
    { key: "likelihood", label: t("mitigationPlanner.risk.likelihood", "Likelihood"), before: baseline.likelihoodBand, after: projected.likelihoodBand },
    {
      key: "pAttack",
      label: t("mitigationPlanner.risk.pAttack", "Probability of attack"),
      help: t(
        "mitigationPlanner.risk.pAttackHelp",
        "P_attack: the context-dependent probability of attack taken from the configured Controls × Likelihood matrix."
      ),
      before: formatPercentageValue(baseline.attackProbability),
      after: formatPercentageValue(projected.attackProbability),
    },
    {
      key: "rAnon",
      label: t("mitigationPlanner.risk.rAnon", "Anonymization threshold"),
      help: t(
        "mitigationPlanner.risk.rAnonHelp",
        "R_anon = min(1, T / P_attack): the maximum residual re-identification risk permitted for the data under this sharing context. It is a requirement, not a measurement of the dataset."
      ),
      before: formatPercentageValue(baseline.recommendedAnonymizationThreshold),
      after: formatPercentageValue(projected.recommendedAnonymizationThreshold),
    },
  ];

  return (
    <RABox>
      <RATypography variant="subtitle1" fontWeight="bold" mb={1}>
        {t("mitigationPlanner.risk.comparisonTitle", "Baseline vs Selected Mitigation Plan")}
      </RATypography>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 480 }} aria-label={t("mitigationPlanner.risk.comparisonTitle", "Baseline vs Selected Mitigation Plan")}>
          <TableHead>
            <TableRow>
              <TableCell>{t("mitigationPlanner.risk.metric", "Metric")}</TableCell>
              <TableCell>{t("mitigationPlanner.risk.baseline", "Baseline")}</TableCell>
              <TableCell>{`${t("mitigationPlanner.risk.selectedPlan", "Selected Plan")} ${planLabel}`.trim()}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const changed = row.before !== row.after;
              const changedSx = changeTone ? { color: changeTone } : undefined;
              return (
                <TableRow key={row.key}>
                  <TableCell>
                    <RABox display="flex" alignItems="center" gap={0.75}>
                      {row.label}
                      {row.help && (
                        <RequirementHelpTooltip title={row.help}>
                          <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
                        </RequirementHelpTooltip>
                      )}
                    </RABox>
                  </TableCell>
                  <TableCell>{row.before || "—"}</TableCell>
                  <TableCell>
                    {changed ? (
                      <RABox display="flex" alignItems="center" gap={0.75} sx={changedSx}>
                        <ArrowForwardIcon fontSize="small" aria-label={t("mitigationPlanner.risk.changed", "changed")} />
                        <strong>{row.after || "—"}</strong>
                      </RABox>
                    ) : (
                      row.after || "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </RABox>
  );
}

const stateShape = PropTypes.shape({
  controlsBand: PropTypes.string,
  likelihoodBand: PropTypes.string,
  attackProbability: PropTypes.number,
  recommendedAnonymizationThreshold: PropTypes.number,
});

BaselinePlanComparison.propTypes = {
  context: PropTypes.shape({
    impactBand: PropTypes.string,
    targetThreshold: PropTypes.number,
    baseline: stateShape.isRequired,
    projected: stateShape.isRequired,
  }).isRequired,
  planLabel: PropTypes.string,
};

BaselinePlanComparison.defaultProps = { planLabel: "" };
