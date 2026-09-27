import React from "react";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";

import RAInput from "components/input/RAInput";

import {
  SHARING_ARRANGEMENTS,
  normalizeSharingArrangement,
} from "../mitigationActionFormUtils";
import AdminField, { compactInputSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

function optionLabel(options, value) {
  return (
    options.find((option) => option.value === value)?.label ||
    String(value || "")
      .toLowerCase()
      .split("_")
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
      .join(" ")
  );
}

export default function ApplicabilitySection({ form, onChange }) {
  return (
    <MitigationActionSection
      title="Applicability"
      description="Optionally restrict this action to particular sharing arrangements. Leave empty when the action can be considered regardless of the sharing model."
    >
      <AdminField
        label="Sharing Arrangements"
        info={FIELD_HELP.sharingArrangements}
      >
        <RAInput
          select
          value={form.applicableSharingArrangements || []}
          onChange={(event) => {
            const value = event.target.value;
            const values = typeof value === "string" ? value.split(",") : value;
            onChange(
              "applicableSharingArrangements",
              Array.from(new Set(values.map(normalizeSharingArrangement)))
            );
          }}
          inputProps={{ "aria-label": "Sharing Arrangements" }}
          fullWidth
          size="small"
          sx={compactInputSx}
          SelectProps={{
            multiple: true,
            displayEmpty: true,
            renderValue: (selected) =>
              selected?.length
                ? selected
                    .map((value) => optionLabel(SHARING_ARRANGEMENTS, value))
                    .join(", ")
                : "Applicable to all sharing arrangements",
          }}
        >
          {SHARING_ARRANGEMENTS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={(form.applicableSharingArrangements || []).includes(
                  option.value
                )}
              />
              {option.label}
            </MenuItem>
          ))}
        </RAInput>
      </AdminField>
    </MitigationActionSection>
  );
}
