import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ProjectConstraintChip from "./ProjectConstraintChip";

/** Status chip; the backend's explanation (check.note) is available in a tooltip. */
function CheckStatus({ check }) {
  const note = String(check.note || "").trim();
  if (!note) return <ProjectConstraintChip result={check.status} />;

  return (
    <RequirementHelpTooltip title={note}>
      <RABox component="span" display="inline-flex" alignItems="center" gap={0.5} sx={{ cursor: "help" }}>
        <ProjectConstraintChip result={check.status} />
        <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </RABox>
    </RequirementHelpTooltip>
  );
}

CheckStatus.propTypes = {
  check: PropTypes.shape({ status: PropTypes.string, note: PropTypes.string }).isRequired,
};

// Every check was computed by the backend; this component only renders it.
export default function ProjectConstraintChecks({ checks }) {
  const { t } = useTranslation();

  return (
    <RABox>
      <RATypography variant="h6" fontWeight="bold" textAlign="center" width="100%" mb={1}>
        {t("mitigationPlanner.checks.title", "Project Constraint Checks")}
      </RATypography>
      {checks.length === 0 ? (
        <RATypography variant="body2">
          {t("mitigationPlanner.checks.none", "The Project defines no requirements that can be checked against this plan.")}
        </RATypography>
      ) : (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ minWidth: 620 }} aria-label={t("mitigationPlanner.checks.title", "Project Constraint Checks")}>
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
                <TableRow key={check.key}>
                  <TableCell>{check.label}</TableCell>
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

ProjectConstraintChecks.propTypes = { checks: PropTypes.array };
ProjectConstraintChecks.defaultProps = { checks: [] };
