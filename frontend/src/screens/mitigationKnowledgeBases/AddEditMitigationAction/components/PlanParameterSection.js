import React from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleIcon from "@mui/icons-material/AddCircle";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";

import {
  PARAMETER_CODES,
  TARGET_RESOLUTIONS,
  parameterDefaults,
} from "../mitigationActionFormUtils";
import AdminField, { compactInputSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

export default function PlanParameterSection({
  parameters,
  errors,
  showErrors,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const usedParameterCodes = new Set(
    parameters.map((parameter) => parameter.parameterCode)
  );
  const canAdd = parameters.length < PARAMETER_CODES.length;

  return (
    <MitigationActionSection
      title="Plan Parameters"
      description="Parameters describe values that must be chosen later when this action is used inside a concrete mitigation plan. They do not transform the dataset at catalogue-configuration time."
    >
      <RABox display="flex" flexDirection="column" gap={2}>
        {parameters.map((parameter, index) => (
          <PlanParameterRule
            key={parameter.clientId}
            parameter={parameter}
            errors={errors[index] || {}}
            showErrors={showErrors}
            usedParameterCodes={usedParameterCodes}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
        <RABox>
          <RAButton
            type="button"
            variant="text"
            color="primary"
            startIcon={<AddCircleIcon />}
            onClick={onAdd}
            disabled={!canAdd}
          >
            Add Plan Parameter
          </RAButton>
        </RABox>
      </RABox>
    </MitigationActionSection>
  );
}

function PlanParameterRule({
  parameter,
  errors,
  showErrors,
  usedParameterCodes,
  onUpdate,
  onRemove,
}) {
  return (
    <Grid container spacing={2} alignItems="flex-start">
      <Grid item xs={12} md={5}>
        <AdminField
          label="Parameter Type"
          info={FIELD_HELP.parameterType}
          error={showErrors ? errors.parameterCode : ""}
        >
          <RAInput
            select
            value={parameter.parameterCode || ""}
            onChange={(event) =>
              onUpdate(parameter.clientId, parameterDefaults(event.target.value))
            }
            inputProps={{ "aria-label": "Parameter Type" }}
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.parameterCode)}
          >
            {PARAMETER_CODES.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={
                  option.value !== parameter.parameterCode &&
                  usedParameterCodes.has(option.value)
                }
              >
                {option.label}
              </MenuItem>
            ))}
          </RAInput>
        </AdminField>
      </Grid>
      <Grid item xs={12} md={6}>
        <ParameterConfiguration
          parameter={parameter}
          error={showErrors ? errors.allowedValues : ""}
          onUpdate={onUpdate}
        />
      </Grid>
      <Grid item xs={12} md={1}>
        <RABox
          display="flex"
          justifyContent={{ xs: "flex-start", md: "center" }}
          pt={{ xs: 0, md: 3.2 }}
        >
          <IconButton
            color="error"
            onClick={() => onRemove(parameter.clientId)}
            aria-label="Remove plan parameter"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </RABox>
      </Grid>
    </Grid>
  );
}

function ParameterConfiguration({ parameter, error, onUpdate }) {
  if (parameter.parameterCode === "TARGET_RESOLUTION") {
    const selectedValues = parameter.allowedValues || [];
    return (
      <AdminField label="Allowed Resolutions" error={error}>
        <RABox display="flex" flexWrap="wrap" gap={1}>
          {TARGET_RESOLUTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onChange={(event) => {
                    const nextValues = event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((value) => value !== option.value);
                    onUpdate(parameter.clientId, { allowedValues: nextValues });
                  }}
                />
              }
              label={option.label}
            />
          ))}
        </RABox>
      </AdminField>
    );
  }

  const message =
    parameter.parameterCode === "SUPPRESSION_LIMIT"
      ? "The concrete mitigation plan must specify the permitted suppression limit. The value will later be checked against Project utility constraints such as minimum cohort retention."
      : "A concrete hierarchy or binning rule must be supplied when this action is used in a mitigation plan.";

  return (
    <RABox pt={{ xs: 0, md: 3 }}>
      <RATypography variant="body2" sx={{ color: "text.secondary" }}>
        {message}
      </RATypography>
    </RABox>
  );
}
