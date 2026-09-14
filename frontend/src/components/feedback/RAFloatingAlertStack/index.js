import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAAlert from "components/feedback/RAAlert";

/**
 * Single reusable presentation for every application-controlled, user-facing
 * error (and related status) message: a fixed stack anchored to the
 * bottom-right corner of the viewport, stacked vertically with no overlap.
 *
 * Screens own their own error state (e.g. `useState`/redux slices) and simply
 * describe what should currently be visible via `alerts`. Entries with no
 * `message` are skipped, so callers can pass permanently-shaped arrays such as
 * `[{ id: "lockError", message: lockError, onClose: clearLockError }]`
 * without conditionally building the array themselves.
 */
function RAFloatingAlertStack({ alerts }) {
  const theme = useTheme();
  const visibleAlerts = alerts.filter((alert) => Boolean(alert?.message));

  if (!visibleAlerts.length) return null;

  return (
    <RABox
      sx={{
        position: "fixed",
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        zIndex: theme.zIndex.snackbar,
        width: 300,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {visibleAlerts.map(
        ({ id, color, message, onClose, dismissible }) => (
          <RAAlert
            key={id}
            color={color || "error"}
            dismissible={dismissible !== false}
            onClose={onClose}
          >
            <RATypography
              variant="body2"
              color="white"
              sx={{ whiteSpace: "pre-line" }}
            >
              {message}
            </RATypography>
          </RAAlert>
        )
      )}
    </RABox>
  );
}

RAFloatingAlertStack.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
        .isRequired,
      color: PropTypes.oneOf([
        "primary",
        "secondary",
        "info",
        "success",
        "warning",
        "error",
        "light",
        "dark",
      ]),
      message: PropTypes.node,
      onClose: PropTypes.func,
      dismissible: PropTypes.bool,
    })
  ),
};

RAFloatingAlertStack.defaultProps = {
  alerts: [],
};

export default RAFloatingAlertStack;
