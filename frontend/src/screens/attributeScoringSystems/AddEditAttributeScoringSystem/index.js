import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import {
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Switch,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import RAAlert from "components/feedback/RAAlert";
import { isAdminUser } from "utils/auth";
import { formatScoreRange } from "utils/AttributeScale";
import {
  createAttributeScoringSystemApi,
  fetchAttributeScoringSystemApi,
  fetchAttributeScoringSystemsApi,
  updateAttributeScoringSystemApi,
} from "api/attributeScoringSystems";

const DIMENSIONS = [
  { key: "replicability", label: "Replicability" },
  { key: "availability", label: "Availability" },
  { key: "distinguishability", label: "Distinguishability" },
  { key: "sensitivity", label: "Sensitivity" },
];

const PREDEFINED_SCORE_LABELS = [
  "Low",
  "Moderate",
  "High",
  "Very High",
  "Critical",
];
const MAX_SCORE_OPTIONS_PER_DIMENSION = PREDEFINED_SCORE_LABELS.length;

let optionClientSequence = 0;

function nextOptionClientId() {
  optionClientSequence += 1;
  return `scoring-option-${optionClientSequence}`;
}

const defaultOptions = () => [
  { clientId: nextOptionClientId(), label: "Low", value: "1", displayOrder: 1 },
  {
    clientId: nextOptionClientId(),
    label: "Moderate",
    value: "2",
    displayOrder: 2,
  },
  { clientId: nextOptionClientId(), label: "High", value: "3", displayOrder: 3 },
];

const emptyForm = () => ({
  id: null,
  name: "",
  description: "",
  active: true,
  defaultSystem: false,
  defaultIdentifiabilityThreshold: "5",
  defaultSensitivityThreshold: "2",
  scoreOptions: DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension.key] = defaultOptions();
    return acc;
  }, {}),
});

function normalizeSystemToForm(system) {
  return {
    id: system.id,
    name: system.name || "",
    description: system.description || "",
    active: Boolean(system.active),
    defaultSystem: Boolean(system.defaultSystem),
    defaultIdentifiabilityThreshold: String(
      system.defaultIdentifiabilityThreshold ?? ""
    ),
    defaultSensitivityThreshold: String(
      system.defaultSensitivityThreshold ?? ""
    ),
    scoreOptions: DIMENSIONS.reduce((acc, dimension) => {
      const options = system.scoreOptions?.[dimension.key] || [];
      acc[dimension.key] = options.map((option, index) => ({
        clientId: nextOptionClientId(),
        id: option.id,
        label: option.label || "",
        value: option.value == null ? "" : String(option.value),
        displayOrder: option.displayOrder ?? index + 1,
      }));
      return acc;
    }, {}),
  };
}

function calculateRanges(scoreOptions) {
  const valuesFor = (key) =>
    (scoreOptions[key] || [])
      .map((option) => Number(option.value))
      .filter(Number.isFinite);

  const min = (values) => (values.length ? Math.min(...values) : 0);
  const max = (values) => (values.length ? Math.max(...values) : 0);

  const r = valuesFor("replicability");
  const a = valuesFor("availability");
  const d = valuesFor("distinguishability");
  const s = valuesFor("sensitivity");

  return {
    identifiability: {
      min: min(r) + min(a) + min(d),
      max: max(r) + max(a) + max(d),
    },
    sensitivity: {
      min: min(s),
      max: max(s),
    },
  };
}

function normalizedLabel(value) {
  return String(value || "").trim().toLowerCase();
}

function isPredefinedScoreLabel(value) {
  return PREDEFINED_SCORE_LABELS.some(
    (label) => normalizedLabel(label) === normalizedLabel(value)
  );
}

function nextPredefinedLabel(options) {
  const usedLabels = new Set(
    (options || []).map((option) => normalizedLabel(option.label)).filter(Boolean)
  );
  const usedIndices = (options || [])
    .map((option) =>
      PREDEFINED_SCORE_LABELS.findIndex(
        (label) => normalizedLabel(label) === normalizedLabel(option.label)
      )
    )
    .filter((index) => index >= 0);
  const maxUsedIndex = usedIndices.length ? Math.max(...usedIndices) : -1;

  return (
    PREDEFINED_SCORE_LABELS.find(
      (label, index) =>
        index > maxUsedIndex && !usedLabels.has(normalizedLabel(label))
    ) ||
    PREDEFINED_SCORE_LABELS.find(
      (label) => !usedLabels.has(normalizedLabel(label))
    ) ||
    ""
  );
}

function hasValidationErrors(errors) {
  if (Object.keys(errors.fields).length > 0) return true;
  if (Object.keys(errors.thresholds).length > 0) return true;
  return Object.values(errors.options).some((rows) =>
    rows.some((row) => Object.keys(row).length > 0)
  );
}

function dimensionValueRange(options) {
  const values = (options || [])
    .map((option) => Number(option.value))
    .filter(Number.isFinite);

  if (values.length === 0) {
    return { min: null, max: null };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function valueTone(value, range) {
  const numeric = Number(value);
  if (
    !Number.isFinite(numeric) ||
    !Number.isFinite(range?.min) ||
    !Number.isFinite(range?.max) ||
    range.min === range.max
  ) {
    return {
      bg: "rgba(123, 128, 154, 0.12)",
      border: "rgba(123, 128, 154, 0.35)",
      color: "text.secondary",
      buttonBg: "rgba(123, 128, 154, 0.16)",
    };
  }

  const ratio = Math.min(
    1,
    Math.max(0, (numeric - range.min) / (range.max - range.min))
  );

  if (ratio <= 0.2) {
    return {
      bg: "rgba(76, 175, 80, 0.14)",
      border: "rgba(76, 175, 80, 0.5)",
      color: "success.main",
      buttonBg: "rgba(76, 175, 80, 0.18)",
    };
  }

  if (ratio <= 0.4) {
    return {
      bg: "rgba(139, 195, 74, 0.16)",
      border: "rgba(139, 195, 74, 0.52)",
      color: "#689f38",
      buttonBg: "rgba(139, 195, 74, 0.2)",
    };
  }

  if (ratio <= 0.65) {
    return {
      bg: "rgba(255, 193, 7, 0.18)",
      border: "rgba(255, 193, 7, 0.58)",
      color: "#f0a000",
      buttonBg: "rgba(255, 193, 7, 0.24)",
    };
  }

  if (ratio <= 0.85) {
    return {
      bg: "rgba(255, 112, 67, 0.15)",
      border: "rgba(255, 112, 67, 0.56)",
      color: "#f4511e",
      buttonBg: "rgba(255, 112, 67, 0.22)",
    };
  }

  return {
    bg: "rgba(244, 67, 53, 0.13)",
    border: "rgba(244, 67, 53, 0.52)",
    color: "error.main",
    buttonBg: "rgba(244, 67, 53, 0.18)",
  };
}

function normalizeDisplayNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const rounded = Number(numeric.toFixed(6));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function optionActionButtonSx(theme) {
  const isDark = theme.palette.mode === "dark";

  return {
    width: 32,
    height: 32,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(123, 128, 154, 0.08)",
    "&:hover": {
      bgcolor: isDark
        ? "rgba(255, 255, 255, 0.16)"
        : "rgba(123, 128, 154, 0.16)",
    },
    "&.Mui-disabled": {
      color: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.2)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      bgcolor: "transparent",
    },
  };
}

function ScoreValueInput({ value, range, onChange, error, helperText }) {
  const tone = valueTone(value, range);

  const nudge = (delta) => {
    const base = Number.isFinite(Number(value)) ? Number(value) : 0;
    onChange(normalizeDisplayNumber(base + delta));
  };

  return (
    <RABox>
      <RABox
        display="flex"
        alignItems="center"
        sx={{
          width: "100%",
          maxWidth: 170,
          borderRadius: 999,
          border: `1px solid ${
            error ? "rgba(244, 67, 53, 0.8)" : tone.border
          }`,
          bgcolor: tone.bg,
          overflow: "hidden",
        }}
      >
        <IconButton
          size="small"
          aria-label="Decrease score value"
          onClick={() => nudge(-1)}
          sx={{ width: 40, height: 40, bgcolor: tone.buttonBg }}
        >
          <RemoveIcon fontSize="small" sx={{ color: tone.color }} />
        </IconButton>
        <RAInput
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ step: "any", "aria-label": "Score value" }}
          sx={{
            flex: 1,
            minWidth: 72,
            "& .MuiOutlinedInput-root": {
              height: 40,
              bgcolor: "transparent",
              borderRadius: 0,
              "& fieldset": { border: "none" },
              "&:hover fieldset": { border: "none" },
              "&.Mui-focused fieldset": { border: "none" },
            },
            "& .MuiOutlinedInput-input": {
              textAlign: "center",
              fontWeight: 800,
              color: tone.color,
              p: 0,
            },
            "& input[type=number]": {
              MozAppearance: "textfield",
            },
            "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
              {
                WebkitAppearance: "none",
                margin: 0,
              },
          }}
        />
        <IconButton
          size="small"
          aria-label="Increase score value"
          onClick={() => nudge(1)}
          sx={{ width: 40, height: 40, bgcolor: tone.buttonBg }}
        >
          <AddIcon fontSize="small" sx={{ color: tone.color }} />
        </IconButton>
      </RABox>
      {helperText && (
        <RATypography variant="caption" color="error" display="block" mt={0.5}>
          {helperText}
        </RATypography>
      )}
    </RABox>
  );
}

function validateForm(form, systems) {
  const errors = { fields: {}, thresholds: {}, options: {} };
  const name = form.name.trim().toLowerCase();

  if (!name) {
    errors.fields.name = "Name is required.";
  } else if (
    systems.some(
      (system) =>
        system.id !== form.id &&
        String(system.name || "").trim().toLowerCase() === name
    )
  ) {
    errors.fields.name = "Name must be unique.";
  }

  if (form.defaultSystem && !form.active) {
    errors.fields.defaultSystem = "The default scoring system must be active.";
  }

  DIMENSIONS.forEach((dimension) => {
    const options = form.scoreOptions[dimension.key] || [];
    const seenValues = new Set();
    const seenLabels = new Set();
    errors.options[dimension.key] = options.map((option) => {
      const rowErrors = {};
      const value = Number(option.value);
      const label = option.label.trim();
      const labelKey = normalizedLabel(label);

      if (!label) {
        rowErrors.label = "Label is required.";
      } else if (!isPredefinedScoreLabel(label)) {
        rowErrors.label = "Select one of the predefined labels.";
      } else if (seenLabels.has(labelKey)) {
        rowErrors.label = "Label must be unique in this dimension.";
      }
      seenLabels.add(labelKey);

      if (option.value === "" || !Number.isFinite(value)) {
        rowErrors.value = "Value must be a valid number.";
      } else {
        const valueKey = String(value);
        if (seenValues.has(valueKey)) {
          rowErrors.value = "Value must be unique in this dimension.";
        }
        seenValues.add(valueKey);
      }
      return rowErrors;
    });

    if (options.length === 0) {
      errors.options[dimension.key] = [
        { label: "At least one option is required." },
      ];
    } else if (options.length > MAX_SCORE_OPTIONS_PER_DIMENSION) {
      errors.options[dimension.key][0] = {
        ...errors.options[dimension.key][0],
        label: `At most ${MAX_SCORE_OPTIONS_PER_DIMENSION} score options are allowed.`,
      };
    }
  });

  const ranges = calculateRanges(form.scoreOptions);
  const identThreshold = Number(form.defaultIdentifiabilityThreshold);
  const sensThreshold = Number(form.defaultSensitivityThreshold);

  if (!Number.isFinite(identThreshold)) {
    errors.thresholds.identifiability = "Threshold must be a valid number.";
  } else if (
    identThreshold < ranges.identifiability.min ||
    identThreshold > ranges.identifiability.max
  ) {
    errors.thresholds.identifiability = `Threshold must be within ${formatScoreRange(
      ranges.identifiability
    )}.`;
  }

  if (!Number.isFinite(sensThreshold)) {
    errors.thresholds.sensitivity = "Threshold must be a valid number.";
  } else if (
    sensThreshold < ranges.sensitivity.min ||
    sensThreshold > ranges.sensitivity.max
  ) {
    errors.thresholds.sensitivity = `Threshold must be within ${formatScoreRange(
      ranges.sensitivity
    )}.`;
  }

  return errors;
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    active: Boolean(form.active),
    defaultSystem: Boolean(form.defaultSystem),
    defaultIdentifiabilityThreshold: Number(
      form.defaultIdentifiabilityThreshold
    ),
    defaultSensitivityThreshold: Number(form.defaultSensitivityThreshold),
    scoreOptions: DIMENSIONS.reduce((acc, dimension) => {
      acc[dimension.key] = (form.scoreOptions[dimension.key] || []).map(
        (option, index) => ({
          id: option.id || null,
          label: option.label.trim(),
          value: Number(option.value),
          description: null,
          displayOrder: index + 1,
        })
      );
      return acc;
    }, {}),
  };
}

export default function AddEditAttributeScoringSystem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const theme = useTheme();
  const isEditMode = Boolean(id);

  const [systems, setSystems] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token || !isAdmin) return undefined;

    let isMounted = true;
    const loadEditorData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [systemsData, scoringSystem] = await Promise.all([
          fetchAttributeScoringSystemsApi(token),
          isEditMode ? fetchAttributeScoringSystemApi(id, token) : null,
        ]);

        if (!isMounted) return;
        setSystems(Array.isArray(systemsData) ? systemsData : []);
        setForm(
          scoringSystem ? normalizeSystemToForm(scoringSystem) : emptyForm()
        );
        setShowErrors(false);
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to load scoring system.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEditorData();

    return () => {
      isMounted = false;
    };
  }, [id, isAdmin, isEditMode, token]);

  const validationErrors = useMemo(
    () => validateForm(form, systems),
    [form, systems]
  );
  const hasErrors = hasValidationErrors(validationErrors);
  const ranges = useMemo(
    () => calculateRanges(form.scoreOptions),
    [form.scoreOptions]
  );
  const dimensionRanges = useMemo(
    () =>
      DIMENSIONS.reduce((acc, dimension) => {
        acc[dimension.key] = dimensionValueRange(
          form.scoreOptions[dimension.key]
        );
        return acc;
      }, {}),
    [form.scoreOptions]
  );

  const updateFormField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateOption = useCallback((dimensionKey, index, field, value) => {
    setForm((prev) => ({
      ...prev,
      scoreOptions: {
        ...prev.scoreOptions,
        [dimensionKey]: prev.scoreOptions[dimensionKey].map((option, idx) =>
          idx === index ? { ...option, [field]: value } : option
        ),
      },
    }));
  }, []);

  const addOption = useCallback((dimensionKey) => {
    setForm((prev) => {
      const nextOptions = prev.scoreOptions[dimensionKey] || [];
      if (nextOptions.length >= MAX_SCORE_OPTIONS_PER_DIMENSION) {
        return prev;
      }

      const values = nextOptions
        .map((option) => Number(option.value))
        .filter(Number.isFinite);
      const nextValue = values.length ? Math.max(...values) + 1 : 1;

      return {
        ...prev,
        scoreOptions: {
          ...prev.scoreOptions,
          [dimensionKey]: [
            ...nextOptions,
            {
              clientId: nextOptionClientId(),
              label: nextPredefinedLabel(nextOptions),
              value: normalizeDisplayNumber(nextValue),
              displayOrder: nextOptions.length + 1,
            },
          ],
        },
      };
    });
  }, []);

  const removeOption = useCallback((dimensionKey, index) => {
    setForm((prev) => ({
      ...prev,
      scoreOptions: {
        ...prev.scoreOptions,
        [dimensionKey]: prev.scoreOptions[dimensionKey].filter(
          (_, idx) => idx !== index
        ),
      },
    }));
  }, []);

  const moveOption = useCallback((dimensionKey, index, direction) => {
    setForm((prev) => {
      const options = [...prev.scoreOptions[dimensionKey]];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= options.length) return prev;
      const [moved] = options.splice(index, 1);
      options.splice(targetIndex, 0, moved);
      return {
        ...prev,
        scoreOptions: { ...prev.scoreOptions, [dimensionKey]: options },
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    setShowErrors(true);
    if (hasErrors || !token || saving) return;

    setSaving(true);
    try {
      if (form.id) {
        await updateAttributeScoringSystemApi(form.id, toPayload(form), token);
      } else {
        await createAttributeScoringSystemApi(toPayload(form), token);
      }
      navigate("/configuration/attribute-scoring-systems");
    } catch (err) {
      setErrorMsg(err.message || "Failed to save scoring system.");
    } finally {
      setSaving(false);
    }
  }, [form, hasErrors, navigate, saving, token]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  const handleCancel = useCallback(() => {
    navigate("/configuration/attribute-scoring-systems");
  }, [navigate]);

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            Only administrators can manage scoring systems.
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  if (loading) {
    return (
      <RABox p={5} display="flex" justifyContent="center">
        <CircularProgress
          size={60}
          thickness={4}
          color="primary"
          disableShrink
        />
      </RABox>
    );
  }

  return (
    <RABox
      component="form"
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          e.target.tagName !== "TEXTAREA" &&
          e.target.tagName !== "BUTTON"
        ) {
          e.preventDefault();
        }
      }}
      display="flex"
      flexDirection="column"
      maxWidth="800px"
      width="100%"
      mx="auto"
      gap={2}
      p={2}
    >
      <RATypography variant="h4" fontWeight="bold" align="center">
        {isEditMode ? "Edit Scoring System" : "Create Scoring System"}
      </RATypography>

      <RABox display="flex" flexDirection="column" gap={2}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <RAInput
                label="Name"
                value={form.name}
                onChange={(e) => updateFormField("name", e.target.value)}
                fullWidth
                required
                error={showErrors && Boolean(validationErrors.fields.name)}
                helperText={showErrors ? validationErrors.fields.name : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <RAInput
                label="Description"
                value={form.description}
                onChange={(e) =>
                  updateFormField("description", e.target.value)
                }
                fullWidth
                multiline
                minRows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.active}
                    onChange={(e) =>
                      updateFormField("active", e.target.checked)
                    }
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.defaultSystem}
                    onChange={(e) =>
                      updateFormField("defaultSystem", e.target.checked)
                    }
                  />
                }
                label="Default"
              />
              {showErrors && validationErrors.fields.defaultSystem && (
                <RATypography variant="caption" color="error">
                  {validationErrors.fields.defaultSystem}
                </RATypography>
              )}
            </Grid>
          </Grid>

          <Divider />

          <RABox>
            <RATypography variant="h6" mb={1}>
              Thresholds
            </RATypography>
            <RATypography variant="caption" color="text" display="block" mb={2}>
              Attainable identifiability range:{" "}
              {formatScoreRange(ranges.identifiability)}. Attainable
              sensitivity range: {formatScoreRange(ranges.sensitivity)}.
            </RATypography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <RAInput
                  label="Default identifiability threshold"
                  type="number"
                  value={form.defaultIdentifiabilityThreshold}
                  onChange={(e) =>
                    updateFormField(
                      "defaultIdentifiabilityThreshold",
                      e.target.value
                    )
                  }
                  inputProps={{
                    min: ranges.identifiability.min,
                    max: ranges.identifiability.max,
                    step: "any",
                  }}
                  fullWidth
                  error={
                    showErrors &&
                    Boolean(validationErrors.thresholds.identifiability)
                  }
                  helperText={
                    showErrors
                      ? validationErrors.thresholds.identifiability
                      : ""
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <RAInput
                  label="Default sensitivity threshold"
                  type="number"
                  value={form.defaultSensitivityThreshold}
                  onChange={(e) =>
                    updateFormField(
                      "defaultSensitivityThreshold",
                      e.target.value
                    )
                  }
                  inputProps={{
                    min: ranges.sensitivity.min,
                    max: ranges.sensitivity.max,
                    step: "any",
                  }}
                  fullWidth
                  error={
                    showErrors &&
                    Boolean(validationErrors.thresholds.sensitivity)
                  }
                  helperText={
                    showErrors ? validationErrors.thresholds.sensitivity : ""
                  }
                />
              </Grid>
            </Grid>
          </RABox>

          <Divider />

          {DIMENSIONS.map((dimension) => (
            <RABox key={dimension.key}>
              <RABox
                mb={1}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr auto",
                    md: "minmax(280px, 1fr) 340px 500px",
                  },
                  columnGap: { xs: 1, md: 1 },
                  alignItems: "center",
                  maxWidth: { md: 660 },
                }}
              >
                <RATypography variant="h6">{dimension.label}</RATypography>
                <RABox
                  sx={{
                    gridColumn: { xs: "2", md: "3" },
                    justifySelf: "start",
                    ml: { xs: 0, md: 3 },
                  }}
                >
                  <Tooltip
                    title={
                      (form.scoreOptions[dimension.key] || []).length >=
                      MAX_SCORE_OPTIONS_PER_DIMENSION
                        ? `Maximum of ${MAX_SCORE_OPTIONS_PER_DIMENSION} score options reached`
                        : "Add option"
                    }
                    arrow
                  >
                    <span>
                      <RAButton
                        type="button"
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        disabled={
                          (form.scoreOptions[dimension.key] || []).length >=
                          MAX_SCORE_OPTIONS_PER_DIMENSION
                        }
                        onClick={() => addOption(dimension.key)}
                      >
                        Add Option
                      </RAButton>
                    </span>
                  </Tooltip>
                </RABox>
              </RABox>

              <RABox display="flex" flexDirection="column" gap={1}>
                {(form.scoreOptions[dimension.key] || []).map(
                  (option, index) => {
                    const rowErrors =
                      validationErrors.options[dimension.key]?.[index] || {};
                    const usedLabels = new Set(
                      (form.scoreOptions[dimension.key] || [])
                        .filter((_, optionIndex) => optionIndex !== index)
                        .map((item) => normalizedLabel(item.label))
                        .filter(Boolean)
                    );

                    return (
                      <RABox
                        key={option.clientId}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "minmax(280px, 1fr) 340px 500px",
                          },
                          columnGap: { xs: 0, md: 1 },
                          rowGap: 1,
                          alignItems: "center",
                          maxWidth: { md: 660 },
                        }}
                      >
                        <RAInput
                          select
                          label="Display label"
                          value={option.label}
                          onChange={(e) =>
                            updateOption(
                              dimension.key,
                              index,
                              "label",
                              e.target.value
                            )
                          }
                          fullWidth
                          error={showErrors && Boolean(rowErrors.label)}
                          helperText={showErrors ? rowErrors.label : ""}
                        >
                          {PREDEFINED_SCORE_LABELS.map((label) => (
                            <MenuItem
                              key={label}
                              value={label}
                              disabled={usedLabels.has(normalizedLabel(label))}
                            >
                              {label}
                            </MenuItem>
                          ))}
                        </RAInput>
                        <ScoreValueInput
                          value={option.value}
                          range={dimensionRanges[dimension.key]}
                          onChange={(nextValue) =>
                            updateOption(
                              dimension.key,
                              index,
                              "value",
                              nextValue
                            )
                          }
                          error={showErrors && Boolean(rowErrors.value)}
                          helperText={showErrors ? rowErrors.value : ""}
                        />
                        <RABox
                          display="flex"
                          justifyContent="flex-start"
                          gap={0.5}
                          ml={{ xs: 0, md: 3 }}
                        >
                          <Tooltip title="Move up" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                sx={optionActionButtonSx(theme)}
                                onClick={() =>
                                  moveOption(dimension.key, index, -1)
                                }
                              >
                                <ArrowUpwardIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move down" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={
                                  index ===
                                  (form.scoreOptions[dimension.key] || [])
                                    .length -
                                    1
                                }
                                sx={optionActionButtonSx(theme)}
                                onClick={() =>
                                  moveOption(dimension.key, index, 1)
                                }
                              >
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove" arrow>
                            <span>
                              <IconButton
                                size="small"
                                sx={optionActionButtonSx(theme)}
                                onClick={() =>
                                  removeOption(dimension.key, index)
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </RABox>
                      </RABox>
                    );
                  }
                )}
              </RABox>
            </RABox>
          ))}
        </RABox>

      <RABox display="flex" justifyContent="center" gap={2} mt={1}>
        <RAButton
          type="button"
          variant="text"
          color="secondary"
          onClick={handleCancel}
        >
          Cancel
        </RAButton>
        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={saving}
          sx={{ minWidth: 200 }}
        >
          {saving
            ? "Saving..."
            : isEditMode
            ? "Update Scoring System"
            : "Create Scoring System"}
        </RAButton>
      </RABox>

      {errorMsg && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            zIndex: theme.zIndex.snackbar,
            width: 360,
          }}
        >
          <RAAlert color="error" dismissible onClose={() => setErrorMsg("")}>
            <RATypography variant="body2" color="white">
              {errorMsg}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </RABox>
  );
}
