import React from "react";
import PropTypes from "prop-types";
import { InputAdornment } from "@mui/material";
import { useTranslation } from "react-i18next";

import RAInput from "components/input/RAInput";
import RASelect from "components/input/RASelect";
import FieldInfo from "./FieldInfo";
import { CURRENCY_CODES, REQUIREMENT_OPTIONS, REQUIREMENTS_WITH_INFO } from "../activityRequirementFields";

// Adds the (i) explanation to fields listed in REQUIREMENTS_WITH_INFO.
function withInfo(t, requirement, label, field) {
  if (!REQUIREMENTS_WITH_INFO.has(requirement)) return field;
  return (
    <FieldInfo label={label} info={t(`activityRequirements.info.${requirement}`)}>
      {field}
    </FieldInfo>
  );
}

const requirementPropTypes = {
  requirement: PropTypes.string.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const requirementDefaultProps = {
  error: undefined,
  disabled: false,
};

/** Date, number or text input of one sharing requirement; "" means not specified. */
export function RequirementInput({
  requirement,
  value,
  error,
  onChange,
  disabled,
  unit,
  inputProps,
  ...textFieldProps
}) {
  const { t } = useTranslation();
  const label = t(`activityRequirements.fields.${requirement}`);

  return withInfo(
    t,
    requirement,
    label,
    <RAInput
      label={label}
      value={value}
      onChange={(event) => onChange(requirement, event.target.value)}
      helperText={error ? t(error) : ""}
      error={Boolean(error)}
      FormHelperTextProps={{ error: Boolean(error) }}
      InputProps={
        unit ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined
      }
      disabled={disabled}
      // RAInput's disabled only blocks the mouse; readOnly also blocks typing.
      inputProps={{ ...inputProps, readOnly: disabled }}
      fullWidth
      {...textFieldProps}
    />
  );
}

RequirementInput.propTypes = {
  ...requirementPropTypes,
  value: PropTypes.string.isRequired,
  unit: PropTypes.string,
  inputProps: PropTypes.object,
};

RequirementInput.defaultProps = {
  ...requirementDefaultProps,
  unit: "",
  inputProps: {},
};

/**
 * Choices of a select requirement. Currency codes are shown as they are, and a stored code that is
 * no longer offered stays selectable.
 */
function selectOptions(requirement, value, t) {
  if (requirement === "budgetCurrency") {
    const codes = !value || CURRENCY_CODES.includes(value) ? CURRENCY_CODES : [...CURRENCY_CODES, value];
    return codes.map((code) => ({ value: code, label: code }));
  }
  return REQUIREMENT_OPTIONS[requirement].map((option) => ({
    value: option,
    label: t(`activityRequirements.options.${option}`),
  }));
}

/**
 * Select of one sharing requirement. A single value can be reset with the explicit "Not specified"
 * choice; for lists, no selection means not specified.
 */
export function RequirementSelect({ requirement, value, error, onChange, disabled, multiple }) {
  const { t } = useTranslation();
  const label = t(`activityRequirements.fields.${requirement}`);
  const options = selectOptions(requirement, value, t);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    // Browser autofill can provide a list as comma-separated text.
    onChange(requirement, multiple && typeof nextValue === "string" ? nextValue.split(",") : nextValue);
  };

  return withInfo(
    t,
    requirement,
    label,
    <RASelect
      label={label}
      value={value}
      onChange={handleChange}
      options={multiple ? options : [{ value: "", label: t("activityRequirements.unspecified") }, ...options]}
      SelectProps={multiple ? { multiple: true } : undefined}
      helperText={error ? t(error) : ""}
      error={Boolean(error)}
      disabled={disabled}
      size="medium"
      fullWidth
    />
  );
}

RequirementSelect.propTypes = {
  ...requirementPropTypes,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]).isRequired,
  multiple: PropTypes.bool,
};

RequirementSelect.defaultProps = {
  ...requirementDefaultProps,
  multiple: false,
};
