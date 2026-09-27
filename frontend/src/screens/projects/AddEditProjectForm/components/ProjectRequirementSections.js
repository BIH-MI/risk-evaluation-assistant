import React from "react";
import PropTypes from "prop-types";
import { Paper } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import ProjectRequirementField from "./ProjectRequirementField";
import { hasNonBlankResponseForKey } from "../projectFormUtils";

const projectSectionPaperSx = {
  p: { xs: 2.5, md: 3 },
  borderRadius: 2,
  bgcolor: ({ palette }) =>
    palette.background.card || palette.background.paper || palette.background.default,
  color: ({ palette }) => palette.text.main || palette.text.primary,
  border: "1px solid",
  borderColor: "divider",
};

export default function ProjectRequirementSections({
  sections,
  responses,
  errors,
  showErrors,
  disabled,
  onChangeResponse,
}) {
  if (!sections || sections.length === 0) return null;
  const hasBudget = hasNonBlankResponseForKey(sections, responses, "availableBudget");

  return (
    <RABox display="flex" flexDirection="column" gap={3}>
      {sections.map((section) => (
        <Paper
          key={section.id}
          elevation={1}
          sx={projectSectionPaperSx}
        >
          <RABox display="flex" flexDirection="column" gap={2}>
            <RABox>
              <RATypography
                variant="h6"
                sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
              >
                {section.title}
              </RATypography>
              {section.helpText && (
                <RATypography
                  variant="body2"
                  sx={{ color: ({ palette }) => palette.text.main || palette.text.secondary }}
                >
                  {section.helpText}
                </RATypography>
              )}
            </RABox>
            <RABox display="flex" flexDirection="column" gap={2}>
              {(section.requirements || []).map((requirement) => (
                <ProjectRequirementField
                  key={requirement.id}
                  requirement={requirement}
                  response={responses[requirement.id] || {}}
                  error={errors[requirement.id]}
                  showErrors={showErrors}
                  disabled={disabled || (requirement.stableKey === "budgetScope" && !hasBudget)}
                  onChange={(changes) => onChangeResponse(requirement.id, changes)}
                />
              ))}
            </RABox>
          </RABox>
        </Paper>
      ))}
    </RABox>
  );
}

ProjectRequirementSections.propTypes = {
  sections: PropTypes.array,
  responses: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChangeResponse: PropTypes.func.isRequired,
};

ProjectRequirementSections.defaultProps = {
  sections: [],
};
