import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Grid, Switch } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RAInput from "components/input/RAInput";
import RASelect from "components/input/RASelect";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import {
  CONSTRAINT_TYPES,
  VALUE_TYPES,
  isNumericValueType,
  isSelectableValueType,
} from "../projectTemplateFormUtils";

const adminControlSx = {
  "& .MuiOutlinedInput-root": {
    height: 44,
    minHeight: 44,
  },
  "& .MuiSelect-select": {
    alignItems: "center",
    display: "flex",
  },
};

function AdminField({ label, required, info, children }) {
  return (
    <RABox display="flex" flexDirection="column" gap={0.75}>
      <RABox
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        minHeight={20}
        gap={1}
      >
        <RATypography
          variant="body2"
          fontWeight="medium"
          sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
        >
          {label}
          {required ? " *" : ""}
        </RATypography>
        {info && (
          <RequirementHelpTooltip title={info}>
            <InfoIcon
              fontSize="small"
              tabIndex={0}
              aria-label={`Information about ${label}`}
              sx={{
                color: ({ palette }) => palette.text.main || palette.text.secondary,
                cursor: "help",
                flexShrink: 0,
              }}
            />
          </RequirementHelpTooltip>
        )}
      </RABox>
      {children}
    </RABox>
  );
}

AdminField.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  info: PropTypes.string,
  children: PropTypes.node,
};

AdminField.defaultProps = {
  required: false,
  info: "",
  children: null,
};

export default function TemplateRequirementEditor({ requirement, errors, showErrors, onChange }) {
  const { t } = useTranslation();

  const valueTypeOptions = VALUE_TYPES.map((valueType) => ({
    value: valueType,
    label: t(`projectTemplateConfiguration.valueTypes.${valueType}`),
  }));
  const constraintTypeOptions = CONSTRAINT_TYPES.map((constraintType) => ({
    value: constraintType,
    label: t(`projectTemplateConfiguration.constraintTypes.${constraintType}`),
  }));

  const selectable = isSelectableValueType(requirement.valueType);
  const hasNumericBounds = isNumericValueType(requirement.valueType) || requirement.valueType === "DURATION";
  const hasUnit = ["INTEGER", "DECIMAL", "MONEY", "DURATION"].includes(requirement.valueType);
  const labelLabel = t("projectTemplateConfiguration.requirement.label");
  const constraintTypeLabel = t("projectTemplateConfiguration.requirement.constraintType");
  const valueTypeLabel = t("projectTemplateConfiguration.requirement.valueType");
  const defaultValueLabel = t("projectTemplateConfiguration.requirement.defaultValue");
  const unitLabel = t("projectTemplateConfiguration.requirement.unit");

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={9}>
        <AdminField label={labelLabel} required>
          <RAInput
            value={requirement.label}
            onChange={(event) => onChange({ label: event.target.value })}
            inputProps={{ "aria-label": labelLabel }}
            fullWidth
            required
            size="small"
            sx={adminControlSx}
            error={showErrors && Boolean(errors.label)}
            helperText={showErrors ? errors.label : ""}
          />
        </AdminField>
      </Grid>

      <Grid item xs={12} md={3}>
        <AdminField
          label={constraintTypeLabel}
          info={t("projectTemplateConfiguration.requirement.constraintTypeHelp")}
        >
          <RASelect
            label=""
            value={requirement.constraintType}
            onChange={(event) => onChange({ constraintType: event.target.value })}
            options={constraintTypeOptions}
            inputProps={{ "aria-label": constraintTypeLabel }}
            fullWidth
            sx={adminControlSx}
          />
        </AdminField>
      </Grid>

      <Grid item xs={12}>
        <RAInput
          label={t("projectTemplateConfiguration.requirement.helpText")}
          value={requirement.helpText}
          onChange={(event) => onChange({ helpText: event.target.value })}
          fullWidth
          multiline
          minRows={1}
        />
      </Grid>

      <Grid item xs={12} md={5}>
        <AdminField
          label={valueTypeLabel}
          info={t("projectTemplateConfiguration.requirement.valueTypeHelp")}
        >
          <RASelect
            label=""
            value={requirement.valueType}
            onChange={(event) => onChange({ valueType: event.target.value })}
            options={valueTypeOptions}
            inputProps={{ "aria-label": valueTypeLabel }}
            fullWidth
            sx={adminControlSx}
          />
        </AdminField>
      </Grid>

      <Grid item xs={12} md={5}>
        <AdminField
          label={defaultValueLabel}
          info={t("projectTemplateConfiguration.requirement.defaultValueHelper")}
        >
          <RAInput
            value={requirement.defaultValue}
            onChange={(event) => onChange({ defaultValue: event.target.value })}
            inputProps={{ "aria-label": defaultValueLabel }}
            fullWidth
            size="small"
            sx={adminControlSx}
            error={showErrors && Boolean(errors.defaultValue)}
            helperText={showErrors && errors.defaultValue ? errors.defaultValue : ""}
          />
        </AdminField>
      </Grid>

      <Grid item xs={12} md={2}>
        <RABox height="100%" display="flex" alignItems="center" justifyContent="center">
          <RequirementHelpTooltip title={t("projectTemplateConfiguration.requirement.requiredHelp")}>
            <Switch
              checked={requirement.required}
              onChange={(event) => onChange({ required: event.target.checked })}
              inputProps={{
                "aria-label": t("projectTemplateConfiguration.requirement.requiredAriaLabel"),
              }}
            />
          </RequirementHelpTooltip>
        </RABox>
      </Grid>

      {hasUnit && (
        <Grid item xs={12} md={4}>
          <AdminField
            label={unitLabel}
            info={
              requirement.valueType === "DURATION"
                ? t("projectTemplateConfiguration.requirement.durationUnitHelper")
                : ""
            }
          >
            <RAInput
              value={requirement.unit}
              onChange={(event) => onChange({ unit: event.target.value })}
              inputProps={{ "aria-label": unitLabel }}
              fullWidth
              size="small"
              sx={adminControlSx}
            />
          </AdminField>
        </Grid>
      )}

      {hasNumericBounds && (
        <>
          <Grid item xs={12} md={4}>
            <RAInput
              label={t("projectTemplateConfiguration.requirement.minValue")}
              value={requirement.minValue}
              onChange={(event) => onChange({ minValue: event.target.value })}
              type="number"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <RAInput
              label={t("projectTemplateConfiguration.requirement.maxValue")}
              value={requirement.maxValue}
              onChange={(event) => onChange({ maxValue: event.target.value })}
              type="number"
              fullWidth
              error={showErrors && Boolean(errors.maxValue)}
              helperText={showErrors ? errors.maxValue : ""}
            />
          </Grid>
        </>
      )}

      {selectable && (
        <Grid item xs={12}>
          <RAInput
            label={t("projectTemplateConfiguration.requirement.allowedValues")}
            value={requirement.allowedValuesText}
            onChange={(event) => onChange({ allowedValuesText: event.target.value })}
            fullWidth
            required
            error={showErrors && Boolean(errors.allowedValuesText)}
            helperText={
              showErrors && errors.allowedValuesText
                ? errors.allowedValuesText
                : t("projectTemplateConfiguration.requirement.allowedValuesHelper")
            }
          />
        </Grid>
      )}
    </Grid>
  );
}

TemplateRequirementEditor.propTypes = {
  requirement: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
