import { forwardRef } from "react";

import PropTypes from "prop-types";

import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";

import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

// custom styles for the NotificationItem
import menuItem from "components/feedback/NotificationItem/styles";

const NotificationItem = forwardRef(({ icon, title, ...rest }, ref) => (
  <MenuItem {...rest} ref={ref} sx={(theme) => menuItem(theme)}>
    <RABox
      component={Link}
      py={0.5}
      display="flex"
      alignItems="center"
      lineHeight={1}
    >
      <RATypography variant="body1" color="secondary" lineHeight={0.75}>
        {icon}
      </RATypography>
      <RATypography variant="button" fontWeight="regular" sx={{ ml: 1 }}>
        {title}
      </RATypography>
    </RABox>
  </MenuItem>
));

// Typechecking props for the NotificationItem
NotificationItem.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
};

export default NotificationItem;
