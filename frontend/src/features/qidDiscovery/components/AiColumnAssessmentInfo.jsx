import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  ButtonBase,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import { useMaterialUIController } from "context";
import {
  REVIEW_STATE,
  SCREENING_LEGEND_STATUSES,
  SCREENING_STATUS,
} from "../ai/screeningStatus";

// Explicit surface colours. REA's dark theme does not set palette.mode, so
// MUI's background.paper/text.primary/divider keep their light defaults
// there, and RATypography turns "dark"/"text" colours white in dark mode.
// Both themes therefore get fixed, opaque, high-contrast colours keyed off
// the controller's darkMode flag.
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

// Icon and colour per status. Colour is never the only signal: every status
// has its own icon shape, accessible name and legend label. `null` tone means the neutral icon
// colour of the current theme.
const STATUS_APPEARANCE = {
  [SCREENING_STATUS.REVIEW_NEEDED]: {
    Icon: WarningAmberRoundedIcon,
    tone: "warning.main",
  },
  [SCREENING_STATUS.AUTO_EXCLUDED]: {
    Icon: VerifiedUserOutlinedIcon,
    tone: "info.main",
  },
  [SCREENING_STATUS.REVIEWED]: {
    Icon: CheckCircleOutlineIcon,
    tone: "success.main",
  },
  [SCREENING_STATUS.NO_EXCLUSION_SUGGESTED]: {
    Icon: InfoOutlinedIcon,
    tone: null,
  },
  [SCREENING_STATUS.NOT_SCREENED]: {
    Icon: RemoveCircleOutlineIcon,
    tone: null,
  },
  [SCREENING_STATUS.PENDING]: { Icon: HourglassEmptyIcon, tone: null },
};

const key = (name) => `datasets.aiSuggestions.${name}`;

function useSurfaceColors() {
  const [controller] = useMaterialUIController();
  return controller.darkMode ? SURFACE_COLORS.dark : SURFACE_COLORS.light;
}

function StatusIcon({ status, colors, size }) {
  const { Icon, tone } = STATUS_APPEARANCE[status];
  return (
    <Icon
      aria-hidden
      sx={{ fontSize: size, color: tone || colors.icon, flexShrink: 0 }}
    />
  );
}

StatusIcon.propTypes = {
  status: PropTypes.oneOf(Object.values(SCREENING_STATUS)).isRequired,
  colors: PropTypes.object.isRequired,
  size: PropTypes.number,
};

StatusIcon.defaultProps = {
  size: 18,
};

function getCategoryText(t, screening) {
  const { prediction, status } = screening;
  if (
    status === SCREENING_STATUS.NOT_SCREENED ||
    status === SCREENING_STATUS.PENDING
  ) {
    return null;
  }
  if (prediction.valueConcept) {
    return t(
      `datasets.directIdentifiers.concepts.${prediction.valueConcept}`,
      prediction.valueConcept
    );
  }
  let text;
  if (prediction.category) {
    text = t(key(`categories.${prediction.category}`), prediction.category);
  } else if (prediction.nameOnly || prediction.valueReview) {
    text = t(
      "datasets.directIdentifiers.potentialIdentifier",
      "Potential identifier"
    );
  } else {
    return t(key("tooltip.categoryUncertain"));
  }
  return prediction.uncertain
    ? t(key("tooltip.uncertainPrediction"), { category: text })
    : text;
}

function LabeledLine({ colors, label, value }) {
  return (
    <Typography
      variant="caption"
      display="block"
      sx={{ color: colors.secondary, lineHeight: 1.45 }}
    >
      {label}:{" "}
      <RABox component="span" sx={{ fontWeight: 600, color: colors.primary }}>
        {value}
      </RABox>
    </Typography>
  );
}

LabeledLine.propTypes = {
  colors: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

/** Screening details: predicted category, contributing evidence, why. */
function ScreeningDetails({ screening, colors }) {
  const { t, i18n } = useTranslation();
  const category = getCategoryText(t, screening);
  const sources = new Intl.ListFormat(i18n.language, {
    type: "conjunction",
  }).format(
    screening.evidence.map((source) => t(key(`tooltip.sources.${source}`)))
  );
  const evidence =
    sources && sources[0].toLocaleUpperCase(i18n.language) + sources.slice(1);

  return (
    <RABox
      display="flex"
      flexDirection="column"
      gap={0.5}
      sx={{ textAlign: "left" }}
    >
      <Typography
        variant="caption"
        fontWeight="bold"
        sx={{
          color: colors.primary,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {t(key("tooltip.title"))}
      </Typography>
      {(category || evidence) && (
        <RABox display="flex" flexDirection="column">
          {category && (
            <LabeledLine
              colors={colors}
              label={t(key("tooltip.categoryLabel"))}
              value={category}
            />
          )}
          {evidence && (
            <LabeledLine
              colors={colors}
              label={t(key("tooltip.evidenceLabel"))}
              value={evidence}
            />
          )}
        </RABox>
      )}
      <Typography
        variant="caption"
        display="block"
        sx={{ color: colors.secondary, lineHeight: 1.45 }}
      >
        {t(key(`tooltip.message.${screening.message}`))}
      </Typography>
    </RABox>
  );
}

ScreeningDetails.propTypes = {
  screening: PropTypes.object.isRequired,
  colors: PropTypes.object.isRequired,
};

const surfaceSx = (colors) => ({
  bgcolor: colors.background,
  color: colors.primary,
  border: "1px solid",
  borderColor: colors.border,
  boxShadow: 3,
  p: 1.25,
  width: "max-content",
  maxWidth: "min(300px, calc(100vw - 32px))",
});

/**
 * Status icon next to the Excluded checkbox. Hover or keyboard focus shows
 * the screening details; click/tap opens them in a popover that also holds
 * the confirmation when a review is required (or, optionally, for an
 * automatic exclusion). Opening either never records a review; the checkbox
 * stays the control for including or excluding the attribute.
 */
export function AiColumnAssessmentInfo({
  screening,
  attributeName,
  excluded,
  onConfirm,
}) {
  const { t } = useTranslation();
  const colors = useSurfaceColors();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const handleTooltipOpen = useCallback(() => setTooltipOpen(true), []);
  const handleTooltipClose = useCallback(() => setTooltipOpen(false), []);
  const handleClick = useCallback((event) => {
    setTooltipOpen(false);
    setAnchorEl(event.currentTarget);
  }, []);
  const handlePopoverClose = useCallback(() => setAnchorEl(null), []);
  const { status } = screening;
  const canConfirm =
    screening.review === REVIEW_STATE.REQUIRED ||
    status === SCREENING_STATUS.AUTO_EXCLUDED;
  const label = t(key(`status.${status}`));
  const action = excluded ? "confirmExclusion" : "keepIncluded";
  const popoverOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip
        open={tooltipOpen && !popoverOpen}
        onOpen={handleTooltipOpen}
        onClose={handleTooltipClose}
        arrow
        placement="top"
        // Keeps the button's own accessible name; the details describe it.
        describeChild
        title={<ScreeningDetails screening={screening} colors={colors} />}
        // Prefer above the indicator; flip and stay inside the viewport
        // when there is not enough room (e.g. first table rows).
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
            // The global tooltip override sets opacity 0.7.
            sx: { ...surfaceSx(colors), opacity: 1 },
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
        <ButtonBase
          onClick={handleClick}
          aria-label={t(key("indicatorAriaLabel"), {
            name: attributeName,
            status: label,
          })}
          aria-haspopup="dialog"
          aria-expanded={popoverOpen}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            p: 0.5,
            borderRadius: 1,
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "info.main",
            },
          }}
        >
          <StatusIcon status={status} colors={colors} />
        </ButtonBase>
      </Tooltip>
      <Popover
        open={popoverOpen}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        marginThreshold={8}
        PaperProps={{
          role: "dialog",
          "aria-label": t(key("tooltip.title")),
          sx: surfaceSx(colors),
        }}
      >
        <ScreeningDetails screening={screening} colors={colors} />
        {canConfirm && (
          <RABox display="flex" justifyContent="flex-end" mt={1}>
            <Button
              size="small"
              variant="outlined"
              color="info"
              onClick={() => {
                setAnchorEl(null);
                onConfirm();
              }}
              aria-label={t(key(`actions.${action}For`), {
                name: attributeName,
              })}
              sx={{ textTransform: "none" }}
            >
              {t(key(`actions.${action}`))}
            </Button>
          </RABox>
        )}
      </Popover>
    </>
  );
}

AiColumnAssessmentInfo.propTypes = {
  // From getColumnScreening (screeningStatus.js).
  screening: PropTypes.shape({
    status: PropTypes.oneOf(Object.values(SCREENING_STATUS)).isRequired,
    review: PropTypes.oneOf(Object.values(REVIEW_STATE)).isRequired,
    message: PropTypes.string.isRequired,
    prediction: PropTypes.object.isRequired,
    evidence: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  attributeName: PropTypes.string.isRequired,
  excluded: PropTypes.bool.isRequired,
  // Records the researcher's decision for the current exclusion state.
  onConfirm: PropTypes.func.isRequired,
};

/** Compact legend of the screening statuses (icon + label). */
export function ScreeningStatusLegend() {
  const { t } = useTranslation();
  const colors = useSurfaceColors();
  return (
    <RABox
      component="ul"
      aria-label={t(key("legend.title"))}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 1.5,
        rowGap: 0.25,
        m: 0,
        p: 0,
        listStyle: "none",
      }}
    >
      <Typography
        component="li"
        variant="caption"
        fontWeight="bold"
        sx={{ color: colors.secondary }}
      >
        {t(key("legend.title"))}:
      </Typography>
      {SCREENING_LEGEND_STATUSES.map((status) => (
        <RABox
          component="li"
          key={status}
          display="inline-flex"
          alignItems="center"
          gap={0.5}
        >
          <StatusIcon status={status} colors={colors} size={14} />
          <Typography variant="caption" sx={{ color: colors.secondary }}>
            {t(key(`status.${status}`))}
          </Typography>
        </RABox>
      ))}
    </RABox>
  );
}
