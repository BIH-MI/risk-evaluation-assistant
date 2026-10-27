import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Grid,
  LinearProgress,
  MenuItem,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import RABox from "components/layout/RABox";
import RAInputRoot from "components/input/RAInput/RAInputRoot";
import RATypography from "components/display/RATypography";
import { AI_INSTALL_STATES } from "features/qidDiscovery/ai/aiScreeningConfiguration";
import {
  AI_MODEL_VALIDATION_STATUS,
  getColumnClassifierModel,
  getSelectableColumnClassifierModels,
} from "features/qidDiscovery/ai/modelConfig";
import FormSection from "./FormSection";

const key = (name) => `qidDiscoveryConfiguration.aiScreening.${name}`;

const VALIDATION_KEYS = {
  [AI_MODEL_VALIDATION_STATUS.APPROVED]: "validation.approved",
  [AI_MODEL_VALIDATION_STATUS.EVALUATED]: "validation.evaluated",
  [AI_MODEL_VALIDATION_STATUS.CONFIGURATION_CHANGED]:
    "validation.configurationChanged",
  [AI_MODEL_VALIDATION_STATUS.NOT_EVALUATED]: "validation.notEvaluated",
};

function modelLabel(modelId) {
  return getColumnClassifierModel(modelId)?.displayName || modelId;
}

/**
 * Select field with real disabled and error states. RAInput only styles
 * them (pointer events, icon), so a disabled RAInput can still be changed
 * with the keyboard and its helper text is never shown as an error.
 */
function SelectField({ disabled, error, children, ...rest }) {
  return (
    <RAInputRoot
      select
      fullWidth
      disabled={disabled}
      error={error}
      ownerState={{ disabled, error, success: false }}
      {...rest}
    >
      {children}
    </RAInputRoot>
  );
}

SelectField.propTypes = {
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  children: PropTypes.node,
};

SelectField.defaultProps = {
  disabled: false,
  error: false,
  children: null,
};

const percentOf = (part, total) =>
  total > 0 ? Math.floor((part / total) * 100) : 0;

/** Installation state of one model, with its install or retry action. */
function InstallationStatus({ status, onInstall, installError, t }) {
  if (!status) {
    return (
      <RATypography variant="caption" color="text">
        {t(key("installation.unknown"))}
      </RATypography>
    );
  }
  if (status.installed) {
    return (
      <RABox display="flex" alignItems="center" gap={0.5}>
        <CheckCircleOutlineIcon
          aria-hidden
          sx={{ fontSize: 16, color: "success.main" }}
        />
        <RATypography variant="caption" color="text">
          {t(key("installation.installed"))}
        </RATypography>
      </RABox>
    );
  }
  if (status.state === AI_INSTALL_STATES.INSTALLING) {
    // Whole files completed, plus the share of the file being downloaded.
    const fileShare = status.fileTotalBytes
      ? status.fileBytes / status.fileTotalBytes
      : 0;
    const percent = percentOf(
      status.filesCompleted + fileShare,
      status.filesTotal
    );
    return (
      <RABox
        display="flex"
        flexDirection="column"
        gap={0.5}
        sx={{ minWidth: 180 }}
      >
        <RATypography variant="caption" color="text" role="status">
          {t(key("installation.installing"), { percent })}
        </RATypography>
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-label={t(key("installation.installing"), { percent })}
          sx={{ "& .MuiLinearProgress-bar": { width: `${percent}%` } }}
        />
      </RABox>
    );
  }
  const failed = status.state === AI_INSTALL_STATES.FAILED || installError;
  return (
    <RABox
      display="flex"
      flexDirection="column"
      alignItems="flex-end"
      gap={0.5}
    >
      {failed && (
        <RATypography
          variant="caption"
          sx={{ color: "error.main" }}
          role="alert"
        >
          {t(key("installation.failed"), {
            error: installError || status.error || "",
          })}
        </RATypography>
      )}
      <Button size="small" variant="outlined" color="info" onClick={onInstall}>
        {failed ? t(key("installation.retry")) : t(key("installation.install"))}
      </Button>
    </RABox>
  );
}

InstallationStatus.propTypes = {
  status: PropTypes.object,
  onInstall: PropTypes.func.isRequired,
  installError: PropTypes.string,
  t: PropTypes.func.isRequired,
};

InstallationStatus.defaultProps = {
  status: null,
  installError: "",
};

/**
 * AI-assisted direct-identifier detection: which locally run models Add
 * Dataset may use for this configuration, and the default. Researchers
 * choose whenever more than one of them is usable. Saved with the
 * configuration version like the profiling limits; disabling screening keeps
 * the model settings. Model installation is deployment-wide and takes effect
 * immediately; it is not part of the configuration version.
 */
export default function AiScreeningSection({
  aiScreening,
  installation,
  errors,
  showErrors,
  onChange,
  onAllowedModelsChange,
  onInstallModel,
}) {
  const { t } = useTranslation();
  const [installErrors, setInstallErrors] = useState({});
  const disabled = !aiScreening.enabled;
  const models = getSelectableColumnClassifierModels();
  // Stored ids this build does not support, so they can be seen and removed.
  const unknownIds = aiScreening.allowedModelIds.filter(
    (id) => !models.some((model) => model.id === id)
  );
  const statusUnavailable = installation?.status === "error";

  const toggleModel = (modelId, checked) => {
    const others = aiScreening.allowedModelIds.filter((id) => id !== modelId);
    onAllowedModelsChange(checked ? [...others, modelId] : others);
  };

  const install = async (modelId) => {
    setInstallErrors((current) => ({ ...current, [modelId]: "" }));
    try {
      await onInstallModel(modelId);
    } catch (error) {
      setInstallErrors((current) => ({
        ...current,
        [modelId]: error.message || "",
      }));
    }
  };

  return (
    <FormSection title={t(key("title"))} description={t(key("description"))}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={aiScreening.enabled}
                onChange={(event) => onChange("enabled", event.target.checked)}
              />
            }
            label={t(key("enabled"))}
          />
          {disabled && (
            <RATypography
              variant="caption"
              display="block"
              sx={{ color: "text.secondary" }}
            >
              {t(key("disabledNotice"))}
            </RATypography>
          )}
        </Grid>

        <Grid item xs={12}>
          {/* Greyed out while screening is disabled; installation stays available. */}
          <RABox sx={{ opacity: disabled ? 0.5 : 1 }}>
            <RATypography variant="button" fontWeight="bold" display="block">
              {t(key("allowedModels"))}
            </RATypography>
            <RATypography variant="caption" color="text" display="block" mb={1}>
              {t(key("allowedModelsHelper"))}
            </RATypography>
          </RABox>
          {statusUnavailable && (
            <RATypography
              variant="caption"
              display="block"
              sx={{ color: "error.main", mb: 1 }}
            >
              {t(key("installation.statusUnavailable"), {
                detail: installation.error || "",
              })}
            </RATypography>
          )}
          <RABox
            component="ul"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {models.map((model, index) => {
              const status = installation?.models?.[model.id] || null;
              const selected = aiScreening.allowedModelIds.includes(model.id);
              return (
                <RABox
                  component="li"
                  key={model.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={1}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderTop: index ? "1px solid" : "none",
                    borderColor: "divider",
                  }}
                >
                  <FormControlLabel
                    sx={{ m: 0, flex: "1 1 320px", alignItems: "flex-start" }}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected}
                        // Only installed models can be offered; a selected one
                        // that is no longer installed can still be removed.
                        disabled={disabled || (!status?.installed && !selected)}
                        onChange={(event) =>
                          toggleModel(model.id, event.target.checked)
                        }
                        sx={{ mt: -0.5 }}
                      />
                    }
                    label={
                      <RABox
                        display="flex"
                        flexDirection="column"
                        sx={{ opacity: disabled ? 0.5 : 1 }}
                      >
                        <RATypography variant="button">
                          {model.displayName}
                        </RATypography>
                        <RATypography variant="caption" color="text">
                          {`${model.repository} @ ${model.revision.slice(
                            0,
                            7
                          )} · ${t(
                            key(VALIDATION_KEYS[model.validationStatus])
                          )}`}
                        </RATypography>
                      </RABox>
                    }
                  />
                  <InstallationStatus
                    status={status}
                    installError={installErrors[model.id]}
                    onInstall={() => install(model.id)}
                    t={t}
                  />
                </RABox>
              );
            })}
            {unknownIds.map((modelId) => (
              <RABox
                component="li"
                key={modelId}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked
                      onChange={() => toggleModel(modelId, false)}
                    />
                  }
                  label={t(key("unsupportedModel"), { model: modelId })}
                />
              </RABox>
            ))}
          </RABox>
          {showErrors && errors.allowedModelIds && (
            <FormHelperText error>{errors.allowedModelIds}</FormHelperText>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <SelectField
            label={t(key("defaultModel"))}
            // Out-of-list values would make MUI warn; validation reports them.
            value={
              aiScreening.allowedModelIds.includes(aiScreening.defaultModelId)
                ? aiScreening.defaultModelId
                : ""
            }
            onChange={(event) => onChange("defaultModelId", event.target.value)}
            disabled={disabled || !aiScreening.allowedModelIds.length}
            error={showErrors && Boolean(errors.defaultModelId)}
            helperText={
              showErrors && errors.defaultModelId
                ? errors.defaultModelId
                : t(key("defaultModelHelper"))
            }
          >
            {aiScreening.allowedModelIds.map((modelId) => (
              <MenuItem key={modelId} value={modelId}>
                {modelLabel(modelId)}
              </MenuItem>
            ))}
          </SelectField>
        </Grid>
      </Grid>
    </FormSection>
  );
}

AiScreeningSection.propTypes = {
  aiScreening: PropTypes.shape({
    enabled: PropTypes.bool.isRequired,
    allowedModelIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    defaultModelId: PropTypes.string.isRequired,
  }).isRequired,
  installation: PropTypes.shape({
    status: PropTypes.string.isRequired,
    error: PropTypes.string,
    installedModelIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    models: PropTypes.object.isRequired,
  }),
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onAllowedModelsChange: PropTypes.func.isRequired,
  onInstallModel: PropTypes.func.isRequired,
};

AiScreeningSection.defaultProps = {
  installation: null,
};
