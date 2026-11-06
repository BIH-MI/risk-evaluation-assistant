import React from "react";
import PropTypes from "prop-types";
import { Box, Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslation } from "react-i18next";
import { useMaterialUIController } from "context";
import { TYPE_NOTE_REASON } from "utils/detectMeasurement";

// Neutral icon colours, as in the screening indicators (REA's dark theme does
// not set palette.mode, so MUI's text colours would stay light-mode grey).
const NOTE_ICON_COLOR = { light: "#7b809a", dark: "rgba(255, 255, 255, 0.8)" };

/**
 * Explains why type detection chose STRING for a column whose values look
 * mostly numeric (typeNote from detectMeasurement).
 */
export function DataTypeNote({ typeNote, attributeName }) {
  const { t } = useTranslation();
  const [controller] = useMaterialUIController();
  const examples = typeNote.examples
    .map((value) => t("datasets.add.typeNotes.quotedValue", { value }))
    .join(", ");

  return (
    <Tooltip
      arrow
      placement="top"
      describeChild
      enterTouchDelay={0}
      leaveTouchDelay={5000}
      title={t(`datasets.add.typeNotes.${typeNote.reason}`, {
        count: typeNote.count,
        total: typeNote.total,
        examples,
      })}
    >
      <Box
        component="span"
        role="img"
        tabIndex={0}
        aria-label={t("datasets.add.typeNotes.ariaLabel", {
          name: attributeName,
        })}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 1,
          color: controller.darkMode
            ? NOTE_ICON_COLOR.dark
            : NOTE_ICON_COLOR.light,
          "&:focus-visible": { outline: "2px solid", outlineColor: "info.main" },
        }}
      >
        <HelpOutlineIcon aria-hidden sx={{ fontSize: 18 }} />
      </Box>
    </Tooltip>
  );
}

DataTypeNote.propTypes = {
  typeNote: PropTypes.shape({
    reason: PropTypes.oneOf(Object.values(TYPE_NOTE_REASON)).isRequired,
    count: PropTypes.number,
    total: PropTypes.number,
    examples: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  attributeName: PropTypes.string.isRequired,
};
