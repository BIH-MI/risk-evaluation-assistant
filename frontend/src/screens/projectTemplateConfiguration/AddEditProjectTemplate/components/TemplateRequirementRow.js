import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import TemplateRequirementEditor from "./TemplateRequirementEditor";

const secondaryActionSx = {
  color: ({ palette }) => palette.text.main || palette.text.secondary,
};

export default function TemplateRequirementRow({
  requirement,
  errors,
  showErrors,
  canRemove,
  deleteDisabledReason,
  isCoreRequirement,
  onChange,
  onRemove,
}) {
  const { t } = useTranslation();
  // New (never-persisted) requirements start expanded so the admin can fill
  // them in immediately; existing ones start collapsed.
  const [expanded, setExpanded] = useState(!requirement.id);

  const hasErrors = showErrors && Object.keys(errors || {}).length > 0;
  const toggleExpanded = () => setExpanded((previous) => !previous);

  return (
    <RABox
      p={1.5}
      sx={{
        border: hasErrors ? "1px solid" : "1px solid transparent",
        borderColor: hasErrors ? "error.main" : "transparent",
        borderRadius: 1,
        transition: "background-color 0.15s",
        "&:hover": {
          bgcolor: expanded ? "transparent" : "action.hover",
        },
      }}
    >
      <RABox display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        <RABox onClick={toggleExpanded} sx={{ cursor: "pointer", flexGrow: 1, minWidth: 0 }}>
          <RATypography variant="button" fontWeight="medium" display="block" lineHeight={1.4}>
            {requirement.label || t("projectTemplateConfiguration.requirement.untitled")}
          </RATypography>
        </RABox>
        <RABox display="flex" gap={0.5} flexShrink={0}>
          <Tooltip title={t("projectTemplateConfiguration.requirement.edit")} arrow>
            <IconButton
              type="button"
              size="small"
              onClick={toggleExpanded}
              aria-label={t("projectTemplateConfiguration.requirement.edit")}
              sx={secondaryActionSx}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!isCoreRequirement && (
            <Tooltip
              title={
                !canRemove && deleteDisabledReason
                  ? deleteDisabledReason
                  : t("projectTemplateConfiguration.requirement.remove")
              }
              arrow
            >
              <span>
                <IconButton
                  type="button"
                  size="small"
                  disabled={!canRemove}
                  onClick={onRemove}
                  aria-label={t("projectTemplateConfiguration.requirement.remove")}
                  sx={secondaryActionSx}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </RABox>
      </RABox>

      {expanded && (
        <RABox
          mt={2}
          pt={2}
          sx={({ palette }) => ({
            bgcolor: "transparent",
            color: palette.text.main || palette.text.primary,
          })}
        >
          <TemplateRequirementEditor
            requirement={requirement}
            errors={errors}
            showErrors={showErrors}
            onChange={onChange}
          />
        </RABox>
      )}
    </RABox>
  );
}

TemplateRequirementRow.propTypes = {
  requirement: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  canRemove: PropTypes.bool.isRequired,
  deleteDisabledReason: PropTypes.string,
  isCoreRequirement: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

TemplateRequirementRow.defaultProps = {
  deleteDisabledReason: "",
  isCoreRequirement: false,
};
