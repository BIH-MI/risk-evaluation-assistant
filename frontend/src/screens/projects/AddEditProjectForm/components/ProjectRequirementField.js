import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import InfoIcon from "@mui/icons-material/Info";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RASelect from "components/input/RASelect";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { formatOptionLabel } from "../projectFormUtils";

const selectSx = {
  "& .MuiOutlinedInput-root": { minHeight: 44 },
  "& .MuiSelect-select": { display: "flex", alignItems: "center", height: "100%" },
};

const CURRENCY_OPTIONS = ["EUR", "CHF", "USD", "GBP"];
const DURATION_UNIT_OPTIONS = ["DAYS", "WEEKS", "MONTHS", "YEARS"];

function RequirementFieldContainer({ requirement, children }) {
  return (
    <RABox display="flex" flexDirection="column" gap={0.75}>
      <RABox display="flex" alignItems="center" justifyContent="space-between" width="100%" gap={1}>
        <RATypography
          variant="body2"
          fontWeight="medium"
          sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
        >
          {requirement.label}
          {requirement.required ? " *" : ""}
        </RATypography>
        {requirement.helpText && (
          <RequirementHelpTooltip title={requirement.helpText}>
            <InfoIcon
              fontSize="small"
              tabIndex={0}
              aria-label={`Information about ${requirement.label}`}
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

RequirementFieldContainer.propTypes = {
  requirement: PropTypes.object.isRequired,
  children: PropTypes.node,
};

RequirementFieldContainer.defaultProps = {
  children: null,
};

export default function ProjectRequirementField({ requirement, response, error, showErrors, disabled, onChange }) {
  const { t } = useTranslation();
  const isFixed = Boolean(requirement.fixedValue);
  const isDisabled = disabled || isFixed;
  const helperText = showErrors && error ? error : "";

  const commonFieldProps = {
    error: showErrors && Boolean(error),
    helperText,
    fullWidth: true,
    disabled: isDisabled,
  };
  const fieldAriaProps = (extra = {}) => ({
    "aria-label": requirement.label,
    ...extra,
  });

  let field;
  switch (requirement.valueType) {
    case "TEXT":
      field = (
        <OnBlurRAInput
          value={response.textValue}
          onCommit={(value) => onChange({ textValue: value })}
          inputProps={fieldAriaProps()}
          {...commonFieldProps}
        />
      );
      break;
    case "LONG_TEXT":
      field = (
        <OnBlurRAInput
          value={response.textValue}
          onCommit={(value) => onChange({ textValue: value })}
          multiline
          rows={3}
          inputProps={fieldAriaProps()}
          {...commonFieldProps}
        />
      );
      break;
    case "INTEGER":
      field = (
        <OnBlurRAInput
          value={response.integerValue}
          onCommit={(value) => onChange({ integerValue: value })}
          type="number"
          inputProps={fieldAriaProps({ step: 1 })}
          {...commonFieldProps}
        />
      );
      break;
    case "DECIMAL":
      if (requirement.unit === "PERCENT") {
        field = (
          <RABox display="grid" gridTemplateColumns="minmax(0, 1fr) auto" gap={1} alignItems="center">
            <OnBlurRAInput
              value={response.decimalValue}
              onCommit={(value) => onChange({ decimalValue: value })}
              type="number"
              inputProps={fieldAriaProps({ step: 0.01, min: requirement.minValue, max: requirement.maxValue })}
              {...commonFieldProps}
            />
            <RATypography
              variant="body2"
              sx={{ color: ({ palette }) => palette.text.main || palette.text.secondary }}
            >
              %
            </RATypography>
          </RABox>
        );
      } else {
        field = (
          <OnBlurRAInput
            value={response.decimalValue}
            onCommit={(value) => onChange({ decimalValue: value })}
            type="number"
            inputProps={fieldAriaProps({ step: 0.01 })}
            {...commonFieldProps}
          />
        );
      }
      break;
    case "MONEY":
      field = (
        <RABox display="grid" gridTemplateColumns={{ xs: "1fr", sm: "2fr 1fr" }} gap={1}>
          <OnBlurRAInput
            value={response.decimalValue}
            onCommit={(value) => onChange({ decimalValue: value })}
            type="number"
            inputProps={fieldAriaProps({ step: 0.01 })}
            {...commonFieldProps}
          />
          <RASelect
            label={t("projects.form.currencyLabel")}
            value={response.unit || ""}
            onChange={(event) => onChange({ unit: event.target.value })}
            options={CURRENCY_OPTIONS.map((currency) => ({ value: currency, label: currency }))}
            fullWidth
            disabled={isDisabled}
            sx={selectSx}
          />
        </RABox>
      );
      break;
    case "DURATION":
      field = (
        <RABox display="grid" gridTemplateColumns={{ xs: "1fr", sm: "2fr 1fr" }} gap={1}>
          <OnBlurRAInput
            value={response.integerValue}
            onCommit={(value) => onChange({ integerValue: value })}
            type="number"
            inputProps={fieldAriaProps({ step: 1 })}
            {...commonFieldProps}
          />
          <RASelect
            label={t("projectTemplateConfiguration.requirement.unit")}
            value={response.unit || ""}
            onChange={(event) => onChange({ unit: event.target.value })}
            options={DURATION_UNIT_OPTIONS.map((unit) => ({
              value: unit,
              label: t(`projects.form.durationUnits.${unit}`),
            }))}
            fullWidth
            disabled={isDisabled}
            sx={selectSx}
          />
        </RABox>
      );
      break;
    case "DATE":
      field = (
        <OnBlurRAInput
          value={response.dateValue}
          onCommit={(value) => onChange({ dateValue: value })}
          type="date"
          inputProps={fieldAriaProps()}
          {...commonFieldProps}
        />
      );
      break;
    case "YES_NO":
      field = (
        <RASelect
          label=""
          value={response.booleanValue === null ? "" : String(response.booleanValue)}
          onChange={(event) => onChange({ booleanValue: event.target.value === "true" })}
          options={[
            { value: "true", label: t("projects.form.answerYes") },
            { value: "false", label: t("projects.form.answerNo") },
          ]}
          sx={selectSx}
          inputProps={fieldAriaProps()}
          {...commonFieldProps}
        />
      );
      break;
    case "YES_NO_UNKNOWN":
      field = (
        <RASelect
          label=""
          value={response.textValue || ""}
          onChange={(event) => onChange({ textValue: event.target.value })}
          options={[
            { value: "YES", label: t("projects.form.answerYes") },
            { value: "NO", label: t("projects.form.answerNo") },
            { value: "UNKNOWN", label: t("projects.form.answerUnknown") },
          ]}
          sx={selectSx}
          inputProps={fieldAriaProps()}
          {...commonFieldProps}
        />
      );
      break;
    case "SINGLE_SELECT":
      field = (
        <RASelect
          label=""
          value={response.selectedValues?.[0] || ""}
          onChange={(event) => onChange({ selectedValues: [event.target.value] })}
          options={(requirement.allowedValues || []).map((option) => ({
            value: option,
            label: formatOptionLabel(option),
          }))}
          sx={selectSx}
          inputProps={fieldAriaProps()}
          {...commonFieldProps}
        />
      );
      break;
    case "MULTI_SELECT": {
      const selected = new Set(response.selectedValues || []);
      const toggle = (option) => {
        const next = new Set(selected);
        if (next.has(option)) {
          next.delete(option);
        } else {
          next.add(option);
        }
        onChange({ selectedValues: Array.from(next) });
      };

      field = (
        <RABox display="flex" flexDirection="column" gap={0.5}>
          <FormGroup row>
            {(requirement.allowedValues || []).map((option) => (
              <FormControlLabel
                key={option}
                control={
                  <Checkbox
                    checked={selected.has(option)}
                    onChange={() => toggle(option)}
                    disabled={isDisabled}
                  />
                }
                label={
                  <RATypography
                    variant="body2"
                    sx={{ color: ({ palette }) => palette.text.main || palette.text.primary }}
                  >
                    {formatOptionLabel(option)}
                  </RATypography>
                }
              />
            ))}
          </FormGroup>
          {showErrors && error ? (
            <RATypography variant="caption" color="error" display="block">
              {error}
            </RATypography>
          ) : null}
        </RABox>
      );
      break;
    }
    default:
      field = null;
  }

  return (
    <RequirementFieldContainer requirement={requirement}>
      {field}
    </RequirementFieldContainer>
  );
}

ProjectRequirementField.propTypes = {
  requirement: PropTypes.object.isRequired,
  response: PropTypes.object.isRequired,
  error: PropTypes.string,
  showErrors: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

ProjectRequirementField.defaultProps = {
  error: "",
};
