import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatPercentageValue } from "screens/dataSharingReport/reportDataUtils";

// Values come from the backend's authoritative REA risk result. REA has no measured residual
// data-risk value, so none is shown here.
export default function BaselineRiskSummary({ baselineRisk }) {
  const { t } = useTranslation();

  if (!baselineRisk) {
    return (
      <RATypography variant="body2">
        {t("mitigationPlanner.baseline.riskUnavailable", "The baseline risk result is unavailable.")}
      </RATypography>
    );
  }

  const rows = [
    [
      t("mitigationPlanner.baseline.threshold", "Overall target threshold T"),
      formatPercentageValue(baselineRisk.effectiveThreshold),
      baselineRisk.thresholdSource === "MANUAL",
    ],
    [t("mitigationPlanner.baseline.attackProbability", "Context probability of attack P_attack"), formatPercentageValue(baselineRisk.attackProbability)],
    [
      t("mitigationPlanner.baseline.anonymizationThreshold", "Anonymization threshold"),
      formatPercentageValue(baselineRisk.anonymizationThreshold),
      false,
      "rAnon",
    ],
    [t("mitigationPlanner.baseline.impact", "Impact / Invasion of Privacy"), baselineRisk.impactBand || "—"],
    [t("mitigationPlanner.baseline.controls", "Controls"), baselineRisk.controlsBand || "—"],
    [t("mitigationPlanner.baseline.likelihood", "Likelihood"), baselineRisk.likelihoodBand || "—"],
  ];

  return (
    <TableContainer>
      <Table size="small" aria-label={t("mitigationPlanner.baseline.title", "Baseline Risk Assessment")}>
        <TableHead>
          <TableRow>
            <TableCell>{t("mitigationPlanner.baseline.metric", "Metric")}</TableCell>
            <TableCell align="right">{t("mitigationPlanner.baseline.value", "Current value")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([label, value, isManual, helpKey]) => (
            <TableRow key={label}>
              <TableCell>
                <RABox display="flex" alignItems="center" gap={0.75}>
                  {label}
                  {helpKey === "rAnon" && (
                    <RequirementHelpTooltip
                      title={t(
                        "mitigationPlanner.baseline.rAnonHelp",
                        "The maximum residual re-identification risk permitted for the data under the current sharing context. It is a requirement, not a measurement of the current dataset."
                      )}
                    >
                      <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
                    </RequirementHelpTooltip>
                  )}
                </RABox>
              </TableCell>
              <TableCell align="right">
                <RABox display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                  {isManual && (
                    <RequirementHelpTooltip
                      title={t(
                        "mitigationPlanner.baseline.manualHelp",
                        "This target threshold was manually specified in the Risk Analysis Summary."
                      )}
                    >
                      <Chip size="small" variant="outlined" color="info" label={t("mitigationPlanner.baseline.userDefined", "User-defined")} />
                    </RequirementHelpTooltip>
                  )}
                  <strong>{value}</strong>
                </RABox>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

BaselineRiskSummary.propTypes = {
  baselineRisk: PropTypes.shape({
    impactBand: PropTypes.string,
    controlsBand: PropTypes.string,
    likelihoodBand: PropTypes.string,
    effectiveThreshold: PropTypes.number,
    thresholdSource: PropTypes.string,
    attackProbability: PropTypes.number,
    anonymizationThreshold: PropTypes.number,
  }),
};

BaselineRiskSummary.defaultProps = { baselineRisk: null };
