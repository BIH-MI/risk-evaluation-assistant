import React from "react";
import RATypography from "components/display/RATypography";
import { formatScaleLabel } from "../evidence/evidenceUtils";

function OriginalValueIndicator({ originalValue, field, scoringSystem, t }) {
  const originalLabel = formatScaleLabel(originalValue, field, scoringSystem);

  return (
    <RATypography
      variant="caption"
      color="text"
      sx={{
        fontSize: "0.65rem",
        lineHeight: 1.1,
        mt: 0.25,
        maxWidth: "116px",
        textAlign: "center",
        overflowWrap: "anywhere",
      }}
    >
      {t("dataSharingActivities.form.originalValue", {
        value: originalLabel,
        defaultValue: "Original: {{value}}",
      })}
    </RATypography>
  );
}

export default OriginalValueIndicator;
