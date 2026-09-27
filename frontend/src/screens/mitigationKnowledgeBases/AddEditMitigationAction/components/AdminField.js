import React from "react";
import FormHelperText from "@mui/material/FormHelperText";
import InfoIcon from "@mui/icons-material/Info";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export const compactInputSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 44,
  },
};

export const selectWrapSx = {
  ...compactInputSx,
  "& .MuiSelect-select": {
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
    lineHeight: 1.35,
    alignItems: "center",
  },
};

export function FieldLabel({ label, required, info }) {
  return (
    <RABox
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      minHeight={20}
    >
      <RATypography
        variant="body2"
        fontWeight="medium"
        sx={{ color: "text.primary" }}
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
            sx={{ color: "text.secondary", cursor: "help", flexShrink: 0 }}
          />
        </RequirementHelpTooltip>
      )}
    </RABox>
  );
}

export default function AdminField({ label, required, info, error, children }) {
  return (
    <RABox display="flex" flexDirection="column" gap={0.75}>
      <FieldLabel label={label} required={required} info={info} />
      {children}
      {error && (
        <FormHelperText error sx={{ mx: 0 }}>
          {error}
        </FormHelperText>
      )}
    </RABox>
  );
}
