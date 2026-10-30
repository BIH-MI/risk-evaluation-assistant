import React from "react";
import PropTypes from "prop-types";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

// Selects and autocompletes that show avatars are taller so the avatar fits.
export const avatarFieldSx = {
  "& .MuiOutlinedInput-root": { height: 56 },
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
};

/** One titled section of the Data Sharing Activity form. */
export default function ActivityFormSection({ title, children }) {
  return (
    <RABox component="section" display="flex" flexDirection="column" gap={2}>
      <RATypography variant="h6">{title}</RATypography>
      {children}
    </RABox>
  );
}

ActivityFormSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
