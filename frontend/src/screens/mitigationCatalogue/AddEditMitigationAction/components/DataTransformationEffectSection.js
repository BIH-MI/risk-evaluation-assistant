import React from "react";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";

import RAInput from "components/input/RAInput";

import {
  RECORD_RETENTION_EFFECTS,
  RESULTING_DATA_FORMS,
} from "../mitigationActionFormUtils";
import AdminField, { compactInputSx } from "./AdminField";
import MitigationActionSection from "./MitigationActionSection";

export default function DataTransformationEffectSection({
  form,
  errors,
  showErrors,
  onChange,
}) {
  return (
    <MitigationActionSection
      title="Data Transformation Effect"
      description="Describe the data representation produced by this action. These fields are used for deterministic Project checks; they are not risk-reduction estimates."
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <AdminField
            label="Resulting Data Form"
            required
            error={showErrors ? errors.resultingDataForm : ""}
          >
            <RAInput
              select
              value={form.resultingDataForm}
              onChange={(event) => onChange("resultingDataForm", event.target.value)}
              inputProps={{ "aria-label": "Resulting Data Form" }}
              fullWidth
              size="small"
              sx={compactInputSx}
              error={showErrors && Boolean(errors.resultingDataForm)}
            >
              {RESULTING_DATA_FORMS.map((option) => (
                <MenuItem key={option.value || "NONE"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RAInput>
          </AdminField>
        </Grid>
        <Grid item xs={12} md={6}>
          <AdminField
            label="Record-Retention Effect"
            required
            error={showErrors ? errors.recordRetentionEffect : ""}
          >
            <RAInput
              select
              value={form.recordRetentionEffect}
              onChange={(event) =>
                onChange("recordRetentionEffect", event.target.value)
              }
              inputProps={{ "aria-label": "Record-Retention Effect" }}
              fullWidth
              size="small"
              sx={compactInputSx}
              error={showErrors && Boolean(errors.recordRetentionEffect)}
            >
              {RECORD_RETENTION_EFFECTS.map((option) => (
                <MenuItem key={option.value || "NONE"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RAInput>
          </AdminField>
        </Grid>
      </Grid>
    </MitigationActionSection>
  );
}
