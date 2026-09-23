import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatPercentageValue } from "screens/dataSharingReport/reportDataUtils";

/**
 * Baseline versus the counterfactual context of the selected plan. All values are backend results
 * of RiskComputationService. R_anon is a requirement; q is a measurement and remains
 * "Not evaluated" because changing context controls does not measure the data.
 */
export default function BaselinePlanComparison({ context, planLabel }) {
  const { t } = useTranslation();
  const notEvaluated = t("mitigationPlanner.risk.notEvaluated", "Not evaluated");
  const { baseline, projected } = context;
  const rows = [
    // Context-only what-ifs keep Impact and T fixed, so both columns share one value.
    { key: "impact", label: t("mitigationPlanner.risk.impact", "Impact / Invasion of Privacy"), before: context.impactBand, after: context.impactBand },
    {
      key: "t",
      label: t("mitigationPlanner.risk.targetThreshold", "Overall target threshold T"),
      before: formatPercentageValue(context.targetThreshold),
      after: formatPercentageValue(context.targetThreshold),
    },
    { key: "controls", label: t("mitigationPlanner.risk.controls", "Mitigating Controls"), before: baseline.controlsBand, after: projected.controlsBand },
    {
      key: "likelihood",
      label: t("mitigationPlanner.risk.likelihood", "Motives & Capacity / Likelihood"),
      before: baseline.likelihoodBand,
      after: projected.likelihoodBand,
    },
    {
      key: "pAttack",
      label: t("mitigationPlanner.risk.pAttack", "Context probability of attack P_attack"),
      before: formatPercentageValue(baseline.attackProbability),
      after: formatPercentageValue(projected.attackProbability),
    },
    {
      key: "rAnon",
      label: t("mitigationPlanner.risk.rAnon", "Required data-risk threshold R_anon"),
      help: t(
        "mitigationPlanner.risk.rAnonHelp",
        "The maximum residual re-identification risk permitted for the data under the current sharing context. It is a requirement, not a measurement of the current dataset."
      ),
      before: formatPercentageValue(baseline.recommendedAnonymizationThreshold),
      after: formatPercentageValue(projected.recommendedAnonymizationThreshold),
    },
    { key: "q", label: t("mitigationPlanner.risk.q", "Measured residual data risk q"), before: notEvaluated, after: notEvaluated },
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
                  <TableCell>
                    <strong>{row.before || "—"}</strong>
                  </TableCell>
                  <TableCell sx={changed ? { color: "info.main" } : undefined}>
                    <strong>{row.after || "—"}</strong>
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
