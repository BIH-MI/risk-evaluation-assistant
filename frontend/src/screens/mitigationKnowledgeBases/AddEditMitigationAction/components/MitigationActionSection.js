import React from "react";
import Paper from "@mui/material/Paper";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

const sectionPaperSx = {
  p: { xs: 2, md: 3 },
  borderRadius: 1,
  bgcolor: "background.paper",
  color: "text.primary",
  border: "1px solid",
  borderColor: "divider",
};

export default function MitigationActionSection({ title, description, children }) {
  return (
    <Paper elevation={2} sx={sectionPaperSx}>
      <RATypography
        variant="h6"
        sx={{ color: "text.primary", fontWeight: 600 }}
      >
        {title}
      </RATypography>
      {description && (
        <RATypography
          variant="body2"
          display="block"
          mt={0.5}
          mb={2}
          sx={{ color: "text.secondary" }}
        >
          {description}
        </RATypography>
      )}
      <RABox>{children}</RABox>
    </Paper>
  );
}
