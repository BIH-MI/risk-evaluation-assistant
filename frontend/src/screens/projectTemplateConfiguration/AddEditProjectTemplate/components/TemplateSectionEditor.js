import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Divider, IconButton, Paper, Tooltip } from "@mui/material";

import RAInput from "components/input/RAInput";
import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import TemplateRequirementRow from "./TemplateRequirementRow";
import TemplateSectionCondition from "./TemplateSectionCondition";
import { isCoreRequirementKey, isCoreSectionTitle } from "../projectTemplateFormUtils";

const adminPaperSx = {
  p: { xs: 2, md: 3 },
  borderRadius: 2,
  bgcolor: ({ palette }) =>
    palette.background.card || palette.background.paper || palette.background.default,
  color: ({ palette }) => palette.text.main || palette.text.primary,
  border: "1px solid",
  borderColor: "divider",
};

const secondaryActionSx = {
  color: ({ palette }) => palette.text.main || palette.text.secondary,
};

export default function TemplateSectionEditor({
  allSections,
  section,
  index,
  errors,
  showErrors,
  isFixedSection,
  canRemoveSection,
  canMoveUpSection,
  canMoveDownSection,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddRequirement,
  onUpdateRequirement,
  onRemoveRequirement,
}) {
  const { t } = useTranslation();
  const requirementErrors = errors.requirements || {};
  const sectionTitle = section.title?.trim() || t("projectTemplateConfiguration.section.newSection");
  const showConditionEditor = Boolean(section.dependsOnRequirementKey) || !isCoreSectionTitle(section.title);

  return (
    <Paper
      elevation={2}
      sx={adminPaperSx}
    >
      <RABox display="flex" flexDirection="column" gap={2}>
        <RABox position="relative" minHeight={36} display="flex" alignItems="center" justifyContent="center">
          <RATypography variant="h6" fontWeight="bold" textAlign="center">
            {sectionTitle}
          </RATypography>

          {!isFixedSection && (
            <RABox
              display="flex"
              gap={0.5}
              flexShrink={0}
              sx={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }}
            >
              <Tooltip title={t("projectTemplateConfiguration.section.moveUp")} arrow>
                <span>
                  <IconButton
                    type="button"
                    size="small"
                    disabled={!canMoveUpSection}
                    onClick={onMoveUp}
                    aria-label={t("projectTemplateConfiguration.section.moveUp")}
                    sx={secondaryActionSx}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t("projectTemplateConfiguration.section.moveDown")} arrow>
                <span>
                  <IconButton
                    type="button"
                    size="small"
                    disabled={!canMoveDownSection}
                    onClick={onMoveDown}
                    aria-label={t("projectTemplateConfiguration.section.moveDown")}
                    sx={secondaryActionSx}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t("projectTemplateConfiguration.section.remove")} arrow>
                <span>
                  <IconButton
                    type="button"
                    size="small"
                    disabled={!canRemoveSection}
                    onClick={onRemove}
                    aria-label={t("projectTemplateConfiguration.section.remove")}
                    sx={secondaryActionSx}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </RABox>
          )}
        </RABox>

        <RABox display="flex" flexDirection="column" gap={1.5}>
          <RAInput
            label={t("projectTemplateConfiguration.section.editTitle")}
            value={section.title}
            onChange={(event) => onChange({ title: event.target.value })}
            fullWidth
            required
            error={showErrors && Boolean(errors.title)}
            helperText={showErrors ? errors.title : ""}
          />
          <RAInput
            label={t("projectTemplateConfiguration.section.helpText")}
            value={section.helpText}
            onChange={(event) => onChange({ helpText: event.target.value })}
            fullWidth
            multiline
            minRows={1}
          />

          {showConditionEditor && (
            <TemplateSectionCondition
              sections={allSections}
              sectionIndex={index}
              section={section}
              error={errors.condition}
              showErrors={showErrors}
              onChange={onChange}
            />
          )}
        </RABox>

        <Divider />

        <RABox display="flex" flexDirection="column">
          {section.requirements.map((requirement, requirementIndex) => (
            <React.Fragment key={requirement.clientId}>
              {requirementIndex > 0 && <Divider />}
              <TemplateRequirementRow
                requirement={requirement}
                errors={requirementErrors[requirement.clientId] || {}}
                showErrors={showErrors}
                canRemove={section.requirements.length > 1 && !isCoreRequirementKey(requirement.stableKey)}
                deleteDisabledReason={
                  isCoreRequirementKey(requirement.stableKey)
                    ? t("projectTemplateConfiguration.requirement.coreDeleteDisabled")
                    : ""
                }
                isCoreRequirement={isCoreRequirementKey(requirement.stableKey)}
                onChange={(changes) => onUpdateRequirement(requirement.clientId, changes)}
                onRemove={() => onRemoveRequirement(requirement.clientId)}
              />
            </React.Fragment>
          ))}
        </RABox>

        {showErrors && errors.requirementsEmpty && (
          <RATypography variant="caption" color="error">
            {errors.requirementsEmpty}
          </RATypography>
        )}

        <RABox>
          <RAButton type="button" variant="outlined" size="small" startIcon={<AddIcon />} onClick={onAddRequirement}>
            {t("projectTemplateConfiguration.requirement.add")}
          </RAButton>
        </RABox>
      </RABox>
    </Paper>
  );
}

TemplateSectionEditor.propTypes = {
  allSections: PropTypes.array.isRequired,
  section: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  isFixedSection: PropTypes.bool.isRequired,
  canRemoveSection: PropTypes.bool.isRequired,
  canMoveUpSection: PropTypes.bool.isRequired,
  canMoveDownSection: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onAddRequirement: PropTypes.func.isRequired,
  onUpdateRequirement: PropTypes.func.isRequired,
  onRemoveRequirement: PropTypes.func.isRequired,
};
