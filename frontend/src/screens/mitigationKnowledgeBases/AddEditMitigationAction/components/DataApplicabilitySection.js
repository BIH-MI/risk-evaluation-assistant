import React from "react";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleIcon from "@mui/icons-material/AddCircle";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RAInput from "components/input/RAInput";

import {
  ATTRIBUTE_ROLES,
  DATA_TYPES,
} from "../mitigationActionFormUtils";
import AdminField, { compactInputSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

export default function DataApplicabilitySection({
  mappings,
  errors,
  showErrors,
  onAdd,
  onUpdate,
  onRemove,
}) {
  return (
    <MitigationActionSection
      title="Data Applicability"
      description="Define which kinds of assessed attributes make this transformation applicable. These rules help the future planner find relevant data-side actions."
    >
      <RABox display="flex" flexDirection="column" gap={2}>
        {mappings.map((mapping, index) => (
          <DataApplicabilityRule
            key={mapping.clientId}
            mapping={mapping}
            errors={errors[index] || {}}
            showErrors={showErrors}
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
          >
            Add Data Applicability Rule
          </RAButton>
        </RABox>
      </RABox>
    </MitigationActionSection>
  );
}

function DataApplicabilityRule({
  mapping,
  errors,
  showErrors,
  onUpdate,
  onRemove,
}) {
  const isCombination = mapping.attributeRole === "CANDIDATE_QID_COMBINATION";

  return (
    <Grid container spacing={2} alignItems="flex-start">
      <Grid item xs={12} md={isCombination ? 11 : 5}>
        <AdminField
          label="Attribute Classification"
          info={FIELD_HELP.attributeClassification}
          error={showErrors ? errors.attributeRole : ""}
        >
          <RAInput
            select
            value={mapping.attributeRole || ""}
            onChange={(event) => {
              const attributeRole = event.target.value;
              onUpdate(mapping.clientId, {
                attributeRole,
                dataType:
                  attributeRole === "CANDIDATE_QID_COMBINATION" ||
                  attributeRole === "DIRECT_IDENTIFIER"
                    ? ""
                    : mapping.dataType || "",
              });
            }}
            inputProps={{ "aria-label": "Attribute Classification" }}
            fullWidth
            size="small"
            sx={compactInputSx}
            error={showErrors && Boolean(errors.attributeRole)}
          >
            {ATTRIBUTE_ROLES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RAInput>
        </AdminField>
      </Grid>
      {!isCombination && (
        <Grid item xs={12} md={6}>
          <AdminField label="Data Type" info={FIELD_HELP.dataType}>
            <RAInput
              select
              value={mapping.dataType || ""}
              onChange={(event) =>
                onUpdate(mapping.clientId, { dataType: event.target.value })
              }
              inputProps={{ "aria-label": "Data Type" }}
              fullWidth
              size="small"
              sx={compactInputSx}
            >
              {DATA_TYPES.map((option) => (
                <MenuItem key={option.value || "ANY"} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </RAInput>
          </AdminField>
        </Grid>
      )}
      <Grid item xs={12} md={1}>
        <RABox
          display="flex"
          justifyContent={{ xs: "flex-start", md: "center" }}
          pt={{ xs: 0, md: 3.2 }}
        >
          <IconButton
            color="error"
            onClick={() => onRemove(mapping.clientId)}
            aria-label="Remove data applicability rule"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </RABox>
      </Grid>
    </Grid>
  );
}
