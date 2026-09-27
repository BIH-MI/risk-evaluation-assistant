import React from "react";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";

import RAInput from "components/input/RAInput";

import { ESTIMATE_SCOPES } from "../mitigationActionFormUtils";
import AdminField, { FieldLabel, compactInputSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

const DESCRIPTION =
  "Implementation cost and setup-time estimates used to compare future mitigation plans with Project budget and timing constraints. Provide values when they are known; missing values are treated as unknown, not zero.";

// Missing operational estimates represent UNKNOWN values, not zero-cost or
// zero-time implementations.
export default function OperationalEstimatesSection({
  form,
  errors,
  showErrors,
  onChange,
}) {
  return (
    <MitigationActionSection title="Operational Estimates" description={DESCRIPTION}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FieldLabel label="Estimated Cost" info={FIELD_HELP.costEstimate} />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            type="number"
            value={form.estimatedCostMin}
            onChange={(event) => onChange("estimatedCostMin", event.target.value)}
            inputProps={{ min: 0, "aria-label": "Minimum estimated cost" }}
            label="Min"
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.estimatedCostMin)}
            helperText={showErrors ? errors.estimatedCostMin : ""}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            type="number"
            value={form.estimatedCostMax}
            onChange={(event) => onChange("estimatedCostMax", event.target.value)}
            inputProps={{ min: 0, "aria-label": "Maximum estimated cost" }}
            label="Max"
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.estimatedCostMax)}
            helperText={showErrors ? errors.estimatedCostMax : ""}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RAInput
            value={form.currency}
            onChange={(event) => onChange("currency", event.target.value)}
            inputProps={{ maxLength: 3, "aria-label": "Currency" }}
            label="Currency"
            placeholder="EUR"
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.currency)}
            helperText={showErrors ? errors.currency : ""}
          />
        </Grid>

        <Grid item xs={12} mt={1}>
          <FieldLabel label="Estimated Setup Time" info={FIELD_HELP.setupTime} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RAInput
            type="number"
            value={form.estimatedSetupDaysMin}
            onChange={(event) =>
              onChange("estimatedSetupDaysMin", event.target.value)
            }
            inputProps={{ min: 0, step: 1, "aria-label": "Minimum setup days" }}
            label="Min days"
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.estimatedSetupDaysMin)}
            helperText={showErrors ? errors.estimatedSetupDaysMin : ""}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RAInput
            type="number"
            value={form.estimatedSetupDaysMax}
            onChange={(event) =>
              onChange("estimatedSetupDaysMax", event.target.value)
            }
            inputProps={{ min: 0, step: 1, "aria-label": "Maximum setup days" }}
            label="Max days"
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.estimatedSetupDaysMax)}
            helperText={showErrors ? errors.estimatedSetupDaysMax : ""}
          />
        </Grid>

        <Grid item xs={12}>
          <AdminField
            label="Estimate Scope"
            info={FIELD_HELP.estimateScope}
            error={showErrors ? errors.estimateScope : ""}
          >
            <RAInput
              select
              value={form.estimateScope}
              onChange={(event) => onChange("estimateScope", event.target.value)}
              inputProps={{ "aria-label": "Estimate Scope" }}
              fullWidth
              size="small"
              sx={compactInputSx}
              error={showErrors && Boolean(errors.estimateScope)}
            >
              {ESTIMATE_SCOPES.map((option) => (
                <MenuItem key={option.value || "UNKNOWN"} value={option.value}>
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
