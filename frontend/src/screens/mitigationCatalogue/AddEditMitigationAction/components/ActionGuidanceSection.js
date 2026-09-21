import React from "react";
import Grid from "@mui/material/Grid";

import RAInput from "components/input/RAInput";

import AdminField, { compactInputSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

export default function ActionGuidanceSection({ form, onChange }) {
  return (
    <MitigationActionSection title="Action Guidance">
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <AdminField
            label="Implementation Guidance"
            info={FIELD_HELP.implementationGuidance}
          >
            <RAInput
              value={form.implementationDescription}
              onChange={(event) =>
                onChange("implementationDescription", event.target.value)
              }
              inputProps={{ "aria-label": "Implementation Guidance" }}
              fullWidth
              multiline
              minRows={3}
            />
          </AdminField>
        </Grid>
        <Grid item xs={12}>
          <AdminField
            label="Verification Criteria"
            info={FIELD_HELP.verificationCriteria}
          >
            <RAInput
              value={form.verificationDescription}
              onChange={(event) =>
                onChange("verificationDescription", event.target.value)
              }
              inputProps={{ "aria-label": "Verification Criteria" }}
              fullWidth
              multiline
              minRows={3}
            />
          </AdminField>
        </Grid>
        <Grid item xs={12}>
          <AdminField
            label="Evidence / Reference"
            info={FIELD_HELP.evidenceReference}
          >
            <RAInput
              value={form.source}
              onChange={(event) => onChange("source", event.target.value)}
              inputProps={{ "aria-label": "Evidence / Reference" }}
              fullWidth
              size="small"
              sx={compactInputSx}
            />
          </AdminField>
        </Grid>
      </Grid>
    </MitigationActionSection>
  );
}
