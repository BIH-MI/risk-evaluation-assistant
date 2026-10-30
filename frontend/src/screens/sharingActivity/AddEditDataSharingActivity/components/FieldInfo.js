import React from "react";
import PropTypes from "prop-types";
import { IconButton } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";

import RequirementHelpTooltip from "components/display/RequirementHelpTooltip";
import RABox from "components/layout/RABox";

// The same small (i) button the dataset table assessment shows on the corner of its fields.
const infoButtonSx = {
  position: "absolute",
  top: -8,
  right: -8,
  zIndex: 2,
  width: 20,
  height: 20,
  p: 0,
  color: "info.main",
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: 1,
  "&:hover": { bgcolor: "background.paper" },
};

/** A form field with an (i) button on its top-right corner that explains the field in a tooltip. */
export default function FieldInfo({ label, info, children }) {
  const { t } = useTranslation();

  return (
    <RABox position="relative">
      {children}
      <RequirementHelpTooltip title={info} placement="top-end">
        <IconButton
          size="small"
          aria-label={t("dataSharingActivities.form.fieldInfo", { field: label })}
          sx={infoButtonSx}
        >
          <InfoOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </RequirementHelpTooltip>
    </RABox>
  );
}

FieldInfo.propTypes = {
  label: PropTypes.string.isRequired,
  info: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
