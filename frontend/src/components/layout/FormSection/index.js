import React from "react";
import PropTypes from "prop-types";
import { Divider } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export default function FormSection({ title, description, action, children }) {
  return (
    <RABox display="flex" flexDirection="column" gap={1.5}>
      <Divider />
      <RABox
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
      >
        <RABox>
          <RATypography variant="h6">{title}</RATypography>
          {description && (
            <RATypography
              variant="body2"
              display="block"
              mt={0.25}
              maxWidth={800}
              sx={{ color: "text.secondary" }}
            >
              {description}
            </RATypography>
          )}
        </RABox>
        {action}
      </RABox>
      {children}
    </RABox>
  );
}

FormSection.defaultProps = {
  description: null,
  action: null,
};

FormSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  action: PropTypes.node,
  children: PropTypes.node.isRequired,
};
