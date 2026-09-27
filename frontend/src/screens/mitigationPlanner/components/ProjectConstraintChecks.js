import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ProjectConstraintChip from "./ProjectConstraintChip";

function comparableText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function planEvidenceLines(check) {
  const planEvidence = String(check.planEvidence || "").trim();
  const note = String(check.note || "").trim();
  const lines = [];

  if (planEvidence) lines.push(planEvidence);
  if (note && comparableText(note) !== comparableText(planEvidence)) lines.push(note);

  return lines;
}

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
              {checks.map((check) => {
                const evidenceLines = planEvidenceLines(check);

                return (
                  <TableRow key={check.key}>
                    <TableCell>{check.label}</TableCell>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>{check.required}</TableCell>
                    <TableCell>
                      {evidenceLines.length === 0
                        ? "—"
                        : evidenceLines.map((line, index) => (
                            <RATypography
                              key={`${check.key}:evidence:${index}`}
                              variant="body2"
                              sx={index === 0 ? undefined : { color: "text.secondary" }}
                            >
                              {line}
                            </RATypography>
                          ))}
                    </TableCell>
                    <TableCell>
                      <ProjectConstraintChip result={check.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </RABox>
  );
}

ProjectConstraintChecks.propTypes = { checks: PropTypes.array };
ProjectConstraintChecks.defaultProps = { checks: [] };
