import React from "react";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";

import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";

import { ACTION_TYPES } from "../mitigationActionFormUtils";
import AdminField, { compactInputSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

// Action codes are stable backend identifiers and are intentionally hidden
// from the normal admin form.
export default function BasicSection({
  form,
  errors,
  showErrors,
  isEditMode,
  onChange,
}) {
  return (
    <MitigationActionSection
      title="Basic"
      description="Define one atomic mitigation action."
    >
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <AdminField label="Name" required>
            <RAInput
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              inputProps={{ "aria-label": "Name" }}
              fullWidth
              required
              size="small"
              sx={compactInputSx}
              error={showErrors && Boolean(errors.name)}
              helperText={showErrors ? errors.name : ""}
            />
          </AdminField>
        </Grid>
        <Grid item xs={12} md={5}>
          <AdminField
            label="Action Type"
            required
            info={FIELD_HELP.actionType}
          >
            <RAInput
              select
              value={form.actionType}
              onChange={(event) => onChange("actionType", event.target.value)}
              inputProps={{ "aria-label": "Action Type" }}
              fullWidth
              size="small"
              sx={compactInputSx}
              disabled={isEditMode}
              error={showErrors && Boolean(errors.actionType)}
              helperText={showErrors ? errors.actionType : ""}
            >
              {ACTION_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RAInput>
          </AdminField>
        </Grid>
        <Grid item xs={12}>
          <AdminField label="Description">
            <RAInput
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
              inputProps={{ "aria-label": "Description" }}
              fullWidth
              multiline
              minRows={2}
              helperText="A concise human-readable explanation of what the action does."
            />
          </AdminField>
        </Grid>
        <Grid item xs={12}>
          <AdminField label="Active" info={FIELD_HELP.active}>
            <RABox display="flex" alignItems="center" gap={1}>
              <Switch
                checked={Boolean(form.active)}
                onChange={(event) => onChange("active", event.target.checked)}
                inputProps={{ "aria-label": "Active" }}
              />
              <RATypography variant="body2" sx={{ color: "text.primary" }}>
                {form.active ? "Active" : "Inactive"}
              </RATypography>
            </RABox>
          </AdminField>
        </Grid>
      </Grid>
    </MitigationActionSection>
  );
}
