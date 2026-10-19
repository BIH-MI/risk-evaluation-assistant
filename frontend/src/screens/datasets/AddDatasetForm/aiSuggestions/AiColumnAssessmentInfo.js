import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import {
  CircularProgress,
  ClickAwayListener,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import { useMaterialUIController } from "context";
import {
  AI_SUGGESTION_STATUS,
  suggestsExclusionReview,
} from "qidDiscovery/aiSuggestions";

// Explicit tooltip surface colours. REA's dark theme does not set
// palette.mode, so MUI's background.paper/text.primary/divider keep their
// light defaults there, and RATypography turns "dark"/"text" colours white in
// dark mode. Both themes therefore get fixed, opaque, high-contrast colours
// keyed off the controller's darkMode flag.
const SURFACE_COLORS = {
  light: {
    background: "#ffffff",
    border: "#dee2e6",
    primary: "#344767",
    secondary: "#6c757d",
    icon: "#7b809a",
  },
  dark: {
    background: "#202940",
    border: "rgba(255, 255, 255, 0.16)",
    primary: "#ffffff",
    secondary: "rgba(255, 255, 255, 0.8)",
    icon: "rgba(255, 255, 255, 0.8)",
  },
};

function getCategoryLabel(t, category) {
  return t(
    `datasets.aiSuggestions.categories.${category || "OTHER"}`,
    category || ""
  );
}

// What the model predicted. A manual review decision does not change the
// prediction, so reviewed suggestions keep their original status.
function getPredictionStatus(suggestion) {
  if (suggestion.status === AI_SUGGESTION_STATUS.REVIEWED) {
    return suggestion.review?.reviewedStatus || AI_SUGGESTION_STATUS.SUGGESTED;
  }
  return suggestion.status;
}

/**
 * Maps a prediction and the column's actual exclusion state to the compact
 * assessment shown to the researcher. Classification (what the model thinks)
 * and exclusion (the checkbox) are reported separately.
 */
function getAssessmentView({ suggestion, isPending, excluded, aiAutoExcluded }) {
  if (!suggestion) {
    return {
      tone: "grey.500",
      status: isPending ? "pending" : "notAssessed",
      message: isPending ? "pending" : "notAssessed",
    };
  }
  if (suggestion.status === AI_SUGGESTION_STATUS.UNAVAILABLE) {
    return { tone: "grey.500", status: "unavailable", message: "unavailable" };
  }
  if (getPredictionStatus(suggestion) === AI_SUGGESTION_STATUS.UNCERTAIN) {
    return { tone: "warning.main", status: "manualReview", message: "uncertain" };
  }

  const category = suggestion.category;
  if (suggestsExclusionReview(suggestion)) {
    if (aiAutoExcluded) {
      return {
        tone: "warning.main",
        status: "autoExcluded",
        category,
        message: "autoExcluded",
        guidance: true,
      };
    }
    return excluded
      ? { tone: "warning.main", status: "excluded", category, message: "identifierExcluded" }
      : {
          tone: "warning.main",
          status: "includedManually",
          category,
          message: "identifierIncluded",
        };
  }

  return excluded
    ? { tone: "grey.500", status: "excluded", category, message: "nonIdentifierExcluded" }
    : { tone: "success.main", status: "included", category, message: "included" };
}

function AssessmentContent({ colors, ...props }) {
  const { t } = useTranslation();
  const view = getAssessmentView(props);
  const key = (name) => `datasets.aiSuggestions.tooltip.${name}`;

  return (
    <RABox display="flex" flexDirection="column" gap={0.75} sx={{ maxWidth: 260 }}>
      <Typography variant="button" fontWeight="bold" sx={{ color: colors.primary }}>
        {t(key("title"))}
      </Typography>
      {view.category && (
        <LabeledLine
          colors={colors}
          label={t(key("classificationLabel"))}
          value={getCategoryLabel(t, view.category)}
        />
      )}
      <RABox display="flex" alignItems="center" gap={0.75}>
        <RABox
          component="span"
          sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: view.tone, flexShrink: 0 }}
        />
        <LabeledLine
          colors={colors}
          label={t(key("exclusionLabel"))}
          value={t(key(`status.${view.status}`))}
        />
      </RABox>
      <Typography
        variant="caption"
        display="block"
        sx={{ color: colors.secondary, lineHeight: 1.45 }}
      >
        {t(key(`message.${view.message}`))}
      </Typography>
      {view.guidance && (
        <Typography
          variant="caption"
          fontWeight="medium"
          display="block"
          sx={{ color: colors.primary, lineHeight: 1.45 }}
        >
          {t(key("guidance"))}
        </Typography>
      )}
    </RABox>
  );
}

function LabeledLine({ colors, label, value }) {
  return (
    <Typography variant="caption" display="block" sx={{ color: colors.secondary }}>
      {label}:{" "}
      <RABox component="span" sx={{ fontWeight: 600, color: colors.primary }}>
        {value}
      </RABox>
    </Typography>
  );
}

/**
 * Small information icon shown next to the EXCLUDED checkbox. Opens a
 * read-only AI column assessment on hover, keyboard focus, or click/tap.
 * It contains no controls: the checkbox stays the only way to change the
 * exclusion.
 */
export function AiColumnAssessmentInfo({
  suggestion,
  isPending,
  excluded,
  aiAutoExcluded,
}) {
  const { t } = useTranslation();
  const [controller] = useMaterialUIController();
  const colors = controller.darkMode ? SURFACE_COLORS.dark : SURFACE_COLORS.light;
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleToggle = useCallback(() => setOpen((current) => !current), []);
  const showSpinner = isPending && !suggestion;

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <RABox component="span" display="inline-flex">
        <Tooltip
          open={open}
          onOpen={handleOpen}
          onClose={handleClose}
          arrow
          placement="top"
          describeChild
          title={
            <AssessmentContent
              colors={colors}
              suggestion={suggestion}
              isPending={isPending}
              excluded={excluded}
              aiAutoExcluded={aiAutoExcluded}
            />
          }
          // Prefer above the icon; flip below/sideways and stay inside the
          // viewport when there is not enough room (e.g. first table rows).
          PopperProps={{
            modifiers: [
              {
                name: "flip",
                options: { fallbackPlacements: ["bottom", "left", "right"] },
              },
              { name: "preventOverflow", options: { padding: 8 } },
            ],
          }}
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: colors.background,
                color: colors.primary,
                // The global tooltip override sets opacity 0.7.
                opacity: 1,
                border: "1px solid",
                borderColor: colors.border,
                boxShadow: 3,
                p: 1.25,
                maxWidth: 280,
              },
            },
            arrow: {
              sx: {
                color: colors.background,
                "&::before": {
                  backgroundColor: colors.background,
                  border: "1px solid",
                  borderColor: colors.border,
                },
              },
            },
          }}
        >
          <IconButton
            size="small"
            onClick={handleToggle}
            aria-label={t("datasets.aiSuggestions.tooltip.title")}
            sx={{ p: 0.25, color: aiAutoExcluded ? "warning.main" : colors.icon }}
          >
            {showSpinner ? (
              <CircularProgress size={14} thickness={5} color="inherit" />
            ) : (
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      </RABox>
    </ClickAwayListener>
  );
}

AiColumnAssessmentInfo.propTypes = {
  suggestion: PropTypes.object,
  isPending: PropTypes.bool,
  excluded: PropTypes.bool,
  aiAutoExcluded: PropTypes.bool,
};
