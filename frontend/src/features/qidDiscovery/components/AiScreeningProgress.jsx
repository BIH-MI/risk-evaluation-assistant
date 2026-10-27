import { LabeledLinearProgress } from "components/feedback/LabeledLinearProgress";
import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import { AI_ERROR_CODES } from "features/qidDiscovery/ai/modelConfig";

import { AI_TABLE_STATUS } from "../ai/aiSuggestionTableState";

// The AI could not run at all (no model or worker), as opposed to a
// run that failed part-way.
const UNAVAILABLE_CODES = new Set([
  AI_ERROR_CODES.NO_MODEL_AVAILABLE,
  AI_ERROR_CODES.WORKER_UNAVAILABLE,
]);

const BYTES_PER_MB = 1024 * 1024;

// Whole percent, rounded down so 100% is shown only when everything is done.
const percentOf = (completed, total) =>
  total > 0 ? Math.floor((completed / total) * 100) : 0;

/**
 * Per-table AI screening progress from the worker's progress events:
 * loading the model, classifying column names (completed of total columns,
 * cached columns included), completed, and unavailable / failed. Once
 * screening has ended, `reviewCount` attributes awaiting a researcher
 * decision are mentioned in the same line.
 */
export function AiScreeningProgress({ aiState, reviewCount }) {
  const { t, i18n } = useTranslation();
  const key = (name) => `datasets.aiSuggestions.progress.${name}`;
  const { status, progress, error } = aiState;
  const ariaLabel = t(key("ariaLabel"));
  const withReviewCount = (label) =>
    reviewCount > 0
      ? `${label} ${t(key("reviewRequired"), { count: reviewCount })}`
      : label;

  if (status === AI_TABLE_STATUS.LOADING_MODEL) {
    const totalBytes = Number(progress?.totalBytes) || 0;
    const loadedBytes = Number(progress?.loadedBytes) || 0;
    if (totalBytes > 0 && loadedBytes <= totalBytes) {
      const formatter = new Intl.NumberFormat(i18n.language, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      const percent = percentOf(loadedBytes, totalBytes);
      return (
        <LabeledLinearProgress
          ariaLabel={ariaLabel}
          value={percent}
          label={t(key("loadingModelBytes"), {
            loaded: formatter.format(loadedBytes / BYTES_PER_MB),
            total: formatter.format(totalBytes / BYTES_PER_MB),
            percent,
          })}
        />
      );
    }
    return (
      <LabeledLinearProgress
        ariaLabel={ariaLabel}
        label={t(key("loadingModel"))}
      />
    );
  }

  const completed = Number(progress?.completed) || 0;
  const total = Number(progress?.total) || 0;

  if (status === AI_TABLE_STATUS.CLASSIFYING && total > 0) {
    const percent = percentOf(completed, total);
    return (
      <LabeledLinearProgress
        ariaLabel={ariaLabel}
        value={percent}
        label={t(key("classifying"), { completed, total, percent })}
      />
    );
  }

  // Classification finished. Not shown as "done" in green: researcher
  // review may still be outstanding.
  if (
    status === AI_TABLE_STATUS.READY &&
    progress?.phase === "completed" &&
    total > 0
  ) {
    return (
      <LabeledLinearProgress
        ariaLabel={ariaLabel}
        value={100}
        color="info"
        label={withReviewCount(t(key("completed"), { completed, total }))}
      />
    );
  }

  if (status === AI_TABLE_STATUS.UNAVAILABLE) {
    if (UNAVAILABLE_CODES.has(error?.code)) {
      return (
        <LabeledLinearProgress
          ariaLabel={ariaLabel}
          value={0}
          color="warning"
          label={withReviewCount(t(key("unavailable")))}
        />
      );
    }
    // Never a full bar after a failure.
    const percent = Math.min(percentOf(completed, total), 99);
    return (
      <LabeledLinearProgress
        ariaLabel={ariaLabel}
        value={percent}
        color="error"
        label={withReviewCount(
          t(key("failed"), { completed: Math.min(completed, total), total })
        )}
      />
    );
  }

  return null;
}

AiScreeningProgress.propTypes = {
  aiState: PropTypes.shape({
    status: PropTypes.string.isRequired,
    progress: PropTypes.object,
    error: PropTypes.object,
  }).isRequired,
  reviewCount: PropTypes.number,
};

AiScreeningProgress.defaultProps = {
  reviewCount: 0,
};
