import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ActivityRequirementChip from "./ActivityRequirementChip";
import { humanizeCode } from "../utils/mitigationPlannerFormatters";

/** Status chip; the backend's explanation (check.note) is available in a tooltip. */
function CheckStatus({ check }) {
  const note = String(check.note || "").trim();
  if (!note) return <ActivityRequirementChip result={check.status} />;

  return (
    <RequirementHelpTooltip title={note}>
      <RABox component="span" display="inline-flex" alignItems="center" gap={0.5} sx={{ cursor: "help" }}>
        <ActivityRequirementChip result={check.status} />
        <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </RABox>
    </RequirementHelpTooltip>
  );
}

CheckStatus.propTypes = {
  check: PropTypes.shape({ status: PropTypes.string, note: PropTypes.string }).isRequired,
};

// The requirement in the form's wording, with its fixed constraint type below it.
function RequirementLabel({ check }) {
  const { t } = useTranslation();

  return (
    <>
      {t(`activityRequirements.fields.${check.requirement}`, humanizeCode(check.requirement))}
      {check.constraintType && (
        <RATypography variant="caption" color="text" display="block">
          {t(`activityRequirements.constraintTypes.${check.constraintType}`, humanizeCode(check.constraintType))}
        </RATypography>
      )}
    </>
  );
}

RequirementLabel.propTypes = {
  check: PropTypes.shape({ requirement: PropTypes.string, constraintType: PropTypes.string }).isRequired,
};

// Every check was computed by the backend; this component only renders it.
export default function ActivityRequirementChecks({ checks }) {
  const { t } = useTranslation();

  return (
    <RABox>
      <RATypography variant="h6" fontWeight="bold" textAlign="center" width="100%" mb={1}>
        {t("mitigationPlanner.checks.title", "Sharing Requirement Checks")}
      </RATypography>
      {checks.length === 0 ? (
        <RATypography variant="body2">
          {t("mitigationPlanner.checks.none", "The Activity specifies no sharing requirements that can be checked against this plan.")}
        </RATypography>
      ) : (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 620 }} aria-label={t("mitigationPlanner.checks.title", "Sharing Requirement Checks")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("mitigationPlanner.checks.requirement", "Requirement")}</TableCell>
                <TableCell>{t("mitigationPlanner.checks.required", "Required")}</TableCell>
                <TableCell>{t("mitigationPlanner.checks.evidence", "Plan evidence")}</TableCell>
                <TableCell>{t("mitigationPlanner.checks.check", "Check")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.map((check) => (
                <TableRow key={check.requirement}>
                  <TableCell>
                    <RequirementLabel check={check} />
                  </TableCell>
                  <TableCell sx={{ overflowWrap: "anywhere" }}>{check.required}</TableCell>
                  <TableCell>{check.planEvidence || "—"}</TableCell>
                  <TableCell>
                    <CheckStatus check={check} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </RABox>
  );
}

ActivityRequirementChecks.propTypes = {
  checks: PropTypes.arrayOf(
    PropTypes.shape({
      requirement: PropTypes.string.isRequired,
      constraintType: PropTypes.string,
      required: PropTypes.string,
      planEvidence: PropTypes.string,
      status: PropTypes.string,
      note: PropTypes.string,
    })
  ),
};
ActivityRequirementChecks.defaultProps = { checks: [] };
