import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "react-oidc-context";
import { Trans, useTranslation } from "react-i18next";
import {
  CircularProgress,
  Stack,
  Card,
  MenuItem,
  Box,
  Divider,
  Grid,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

// Import Flag Icons
import { GB, DE } from "country-flag-icons/react/3x2";

import { getErrorMessage } from "../../../utils/errors";
import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import RAButton from "../../../components/input/RAButton";
import RAFloatingAlertStack from "../../../components/feedback/RAFloatingAlertStack";
import RADialog from "../../../components/feedback/RADialog";
import RAInput from "../../../components/input/RAInput";
import {
  fetchConfigurations,
  updateConfiguration,
  forkConfiguration,
  createConfiguration,
  fetchConfiguration,
} from "../../../store/configurations/configurationThunks";
import {
  resetConfigurationState,
  resetSaveSuccess,
  setFullConfig,
  updateConfigurationField,
} from "../../../store/configurations/configurationSlice";

import RiskBandsEditor from "./RiskBandsEditor";
import QuestionsEditor from "./QuestionsEditor";
import RiskMatrixEditor from "./RiskMatrixEditor";
import ReidentificationEditor from "./ReidentificationEditor";

// Predefined supported languages with icons
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", Icon: GB },
  { code: "de", label: "Deutsch", Icon: DE },
];

const WIZARD_STEPS = [
  { code: "IMPACT", label: "Impact", name: "Impact" },
  { code: "CONTROLS", label: "Controls", name: "Controls" },
  { code: "LIKELIHOOD", label: "Likelihood", name: "Likelihood" },
];

export default function AddEditConfigurationForm() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const token = user?.access_token;
  const { t } = useTranslation();

  // 1. Safely extract the ID from EITHER the URL param or the location state
  const rawId = paramId || location.state?.configId;
  const configId = rawId ? Number(rawId) : null;

  // 2. Mode Detection
  const isViewMode =
    location.pathname.endsWith("/view") || location.state?.readOnly;
  const isEditMode = !!configId && !isViewMode;

  // Extract base states
  const {
    items: configs,
    status: configListStatus,
    configDetails,
    loading,
    saveSuccess,
    error,
  } = useSelector((state) => state.configurations);

  // Initialize displayConfig immediately so it can be safely referenced in hooks below
  const displayConfig = configDetails || {};

  const [currentStep, setCurrentStep] = useState(0);

  const [toast, setToast] = useState({
    open: false,
    msg: "",
    severity: "success",
    key: Date.now(),
  });

  const handleRiskBandsError = useCallback(
    (message) => setToast({ open: true, msg: message, severity: "error" }),
    []
  );

  // Dialog States
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");
  const [forkLoading, setForkLoading] = useState(false);

  // 1. Fetch configurations on mount
  useEffect(() => {
    if (token) {
      dispatch(fetchConfigurations(token));
    }
    return () => dispatch(resetConfigurationState());
  }, [dispatch, token]);

  // 2. Initialize Config Details (Blank for Create, Prefilled for Edit/View)
  useEffect(() => {
    if (isEditMode || isViewMode) {
      if (token && configId) {
        dispatch(fetchConfiguration({ id: configId, token }));
        setCurrentStep(0);
      }
    } else {
      // Empty layout for CREATE mode
      dispatch(
        setFullConfig({
          name: "",
          description: "",
          defaultLanguage: "en",
          sharedUsernames: [], // Always empty array now
          categories: [
            {
              code: "IMPACT",
              name: "Impact",
              assessmentPhase: "DATASET_ASSESSMENT",
              riskEffect: "INCREASES_RISK",
              riskBands: [],
            },
            {
              code: "CONTROLS",
              name: "Controls",
              assessmentPhase: "RECIPIENT_ASSESSMENT",
              riskEffect: "DECREASES_RISK",
              riskBands: [],
            },
            {
              code: "LIKELIHOOD",
              name: "Likelihood",
              assessmentPhase: "RECIPIENT_ASSESSMENT",
              riskEffect: "INCREASES_RISK",
              riskBands: [],
            },
          ],
          questions: [],
          riskMatrix: [],
          thresholds: [],
        })
      );
      setCurrentStep(0);
    }
  }, [isEditMode, isViewMode, configId, token, dispatch]);

  // 3. Handle Save Toasts
  useEffect(() => {
    if (saveSuccess) {
      setToast({
        open: true,
        msg: t(
          "configurations.editor.successSave",
          "Configuration '{{name}}' saved successfully!",
          { name: displayConfig.name || "Draft" }
        ),
        severity: "success",
        key: Date.now(),
      });
      dispatch(resetSaveSuccess());
      if (token) dispatch(fetchConfigurations(token));
    }
  }, [saveSuccess, dispatch, token, t, displayConfig.name]);

  useEffect(() => {
    if (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message || "An error occurred";

      setToast({
        open: true,
        msg: errorMessage,
        severity: "error",
        key: Date.now(),
      });
    }
  }, [error]);

  // --- SAVE & SUBMIT LOGIC ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!configDetails?.name?.trim()) return;

    if (isEditMode) {
      dispatch(updateConfiguration({ id: configId, token }));
    } else {
      const newConfigData = {
        ...configDetails,
        isActive: true,
        isDefault: false,
        riskCategories: configDetails.categories || [],
        questions: configDetails.questions || [],
        riskMatrices: configDetails.riskMatrix || [],
        reidThresholds: configDetails.thresholds || [],
      };

      dispatch(createConfiguration({ configData: newConfigData, token }))
        .unwrap()
        .then((newConfig) => {
          setToast({
            open: true,
            msg: t(
              "configurations.editor.successCreate",
              "Configuration created!"
            ),
            severity: "success",
            key: Date.now(),
          });
          navigate(`/configuration/${newConfig.id}/edit`);
        })
        .catch((err) => {
          const errorMessage = getErrorMessage(
            err,
            t("configurations.editor.errorCreate", "Error creating configuration")
          );

          setToast({
            open: true,
            msg: errorMessage,
            severity: "error",
            key: Date.now(),
          });
        });
    }
  };

  const handleForkConfirm = () => {
    if (!newConfigName.trim() || !configId) return;
    setForkLoading(true);

    dispatch(forkConfiguration({ id: configId, newConfigName, token }))
      .unwrap()
      .then((newConfig) => {
        setForkLoading(false);
        setForkDialogOpen(false);
        setNewConfigName("");
        dispatch(fetchConfigurations(token));
        setToast({
          open: true,
          msg: t("configurations.editor.successFork", { name: newConfig.name }),
          severity: "success",
          key: Date.now(),
        });
        navigate(`/configuration/${newConfig.id}/edit`);
      })
      .catch((err) => {
        setForkLoading(false);

        const errorMessage = getErrorMessage(
          err,
          t(
            "configurations.editor.errorFork",
            "Error when duplicating the configuration"
          )
        );

        setToast({
          open: true,
          msg: errorMessage,
          severity: "error",
          key: Date.now(),
        });
      });
  };

  // Full Page Pre-loader (Fixed Spinner)
  if (configListStatus === "loading" && configs.length === 0) {
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

  const activeWizardStep = WIZARD_STEPS[currentStep];

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
      maxWidth="1200px"
      width="100%"
      mx="auto"
      gap={2}
      p={2}
    >
      {/* Dynamic Page Title */}
      <RATypography variant="h4" fontWeight="bold" align="center">
        {isViewMode
          ? t("configurations.editor.viewTitle", "View Configuration")
          : isEditMode
          ? t("configurations.editor.editTitle", "Edit Configuration")
          : t("configurations.editor.createTitle", "Add New Configuration")}
      </RATypography>

      {/* Configuration Core Details */}
      {configDetails && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <RAInput
              label={t("configurations.editor.configName", "Name")}
              fullWidth
              disabled={isViewMode}
              value={displayConfig.name || ""}
              onChange={(e) =>
                dispatch(
                  updateConfigurationField({
                    field: "name",
                    value: e.target.value,
                  })
                )
              }
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <RAInput
              select
              label={t("configurations.editor.defaultLanguage", "Language")}
              fullWidth
              disabled={isViewMode || isEditMode}
              value={displayConfig.defaultLanguage || "en"}
              onChange={(e) =>
                dispatch(
                  updateConfigurationField({
                    field: "defaultLanguage",
                    value: e.target.value,
                  })
                )
              }
              SelectProps={{
                renderValue: (selected) => {
                  const l = SUPPORTED_LANGUAGES.find(
                    (lang) => lang.code === selected
                  );
                  return l ? (
                    <Box display="flex" alignItems="center">
                      <l.Icon
                        style={{
                          width: "20px",
                          marginRight: "8px",
                          borderRadius: "2px",
                        }}
                      />
                      {l.label}
                    </Box>
                  ) : (
                    selected
                  );
                },
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  <Box display="flex" alignItems="center">
                    <lang.Icon
                      title={lang.label}
                      style={{
                        width: "20px",
                        marginRight: "8px",
                        borderRadius: "2px",
                      }}
                    />
                    {lang.label} ({lang.code})
                  </Box>
                </MenuItem>
              ))}
            </RAInput>
          </Grid>
          <Grid item xs={12}>
            <RAInput
              label={t("configurations.editor.description", "Description")}
              fullWidth
              multiline
              minRows={2}
              disabled={isViewMode}
              value={displayConfig.description || ""}
              onChange={(e) =>
                dispatch(
                  updateConfigurationField({
                    field: "description",
                    value: e.target.value,
                  })
                )
              }
            />
          </Grid>
        </Grid>
      )}

      {/* Step Wizard Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="center"
        mt={1}
      >
        {WIZARD_STEPS.map((step, idx) => (
          <RAButton
            key={step.code}
            variant={currentStep === idx ? "contained" : "outlined"}
            color={currentStep === idx ? "primary" : "secondary"}
            onClick={() => setCurrentStep(idx)}
            sx={{
              flex: 1,
              fontWeight: currentStep === idx ? "bold" : "normal",
            }}
          >
            {/* Translated step labels */}
            {t(
              `configurations.categories.${step.code.toLowerCase()}`,
              step.label
            )}
          </RAButton>
        ))}
      </Stack>

      {/* Active Editor Step Content */}
      <Card
        sx={{
          minHeight: 400,
          border: 1,
          borderColor: ({ palette }) => palette.light?.main || palette.divider,
          boxShadow: 1,
          borderRadius: 2,
          p: 2,
        }}
      >
        {loading ? (
          <RABox
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={300}
          >
            {/* Fixed Spinner inside card */}
            <CircularProgress
              size={50}
              thickness={4}
              color="primary"
              disableShrink
            />
          </RABox>
        ) : (
          <RABox>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <RAButton
                variant="outlined"
                color="secondary"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((p) => p - 1)}
                startIcon={<ArrowBackIcon />}
              >
                {t("common.previous", "Previous")}
              </RAButton>
              <RAButton
                variant="outlined"
                color="primary"
                disabled={currentStep === WIZARD_STEPS.length - 1}
                onClick={() => setCurrentStep((p) => p + 1)}
                endIcon={<ArrowForwardIcon />}
              >
                {t("common.next", "Next")}
              </RAButton>
            </Box>

            <RABox mb={2}>
              <RATypography
                variant="h6"
                fontWeight="bold"
                align="center"
                mb={1}
              >
                {t("configurations.categories.riskBandsFor", {
                  name: t(
                    `configurations.categories.${activeWizardStep.code.toLowerCase()}`,
                    activeWizardStep.name
                  ),
                })}
              </RATypography>
              <RiskBandsEditor
                categoryCode={activeWizardStep.code}
                isReadOnly={isViewMode}
                onError={handleRiskBandsError}
              />
            </RABox>

            <Divider sx={{ my: 2 }} />

            <RABox mb={2}>
              <RATypography
                variant="h6"
                fontWeight="bold"
                align="center"
                mb={1}
              >
                {t("configurations.categories.questionsFor", {
                  name: t(
                    `configurations.categories.${activeWizardStep.code.toLowerCase()}`,
                    activeWizardStep.name
                  ),
                })}
              </RATypography>
              <QuestionsEditor
                categoryCode={activeWizardStep.code}
                isReadOnly={isViewMode}
              />
            </RABox>

            {/* Step 1: Re-identification Thresholds */}
            {activeWizardStep.code === "IMPACT" && (
              <>
                <Divider sx={{ my: 2 }} />
                <RABox
                  mt={2}
                  p={2}
                  sx={{ bgcolor: ({ palette }) => palette.background.default }}
                >
                  <RATypography
                    variant="h6"
                    fontWeight="bold"
                    align="center"
                    mb={1}
                  >
                    {t(
                      "configurations.reidThresholds.title",
                      "Re-identification Risk Thresholds"
                    )}
                  </RATypography>
                  <ReidentificationEditor isReadOnly={isViewMode} />
                </RABox>
              </>
            )}

            {/* Step 3: Context Risk Matrix */}
            {activeWizardStep.code === "LIKELIHOOD" && (
              <>
                <Divider sx={{ my: 2 }} />
                <RABox
                  mt={2}
                  p={2}
                  sx={{ bgcolor: ({ palette }) => palette.background.default }}
                >
                  <RATypography
                    variant="h6"
                    fontWeight="bold"
                    align="center"
                    mb={1}
                  >
                    {t(
                      "configurations.riskMatrix.title",
                      "Context Risk Matrix"
                    )}
                  </RATypography>
                  <RiskMatrixEditor isReadOnly={isViewMode} />
                </RABox>
              </>
            )}
          </RABox>
        )}
      </Card>

      {/* Form Action Button */}
      <RABox display="flex" justifyContent="center">
        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          sx={{ minWidth: 200 }}
          disabled={isViewMode || loading || !displayConfig.name?.trim()}
        >
          {isEditMode || isViewMode
            ? t("configurations.editor.updateButton", "Update Configuration")
            : t("configurations.editor.createButton", "Create Configuration")}
        </RAButton>
      </RABox>

      {/* Dialogs */}
      <RADialog
        open={forkDialogOpen}
        title={t("configurations.dialogs.forkTitle")}
        onClose={() => setForkDialogOpen(false)}
        onConfirm={handleForkConfirm}
        confirmText={
          forkLoading
            ? t("configurations.dialogs.forking")
            : t("configurations.dialogs.createFork")
        }
      >
        <RABox mt={1}>
          <RATypography variant="body2" mb={2}>
            <Trans
              i18nKey="configurations.dialogs.forkDesc"
              values={{ name: displayConfig?.name || "" }}
              components={{ strong: <strong /> }}
              defaults="Create a new standalone copy of <strong>{{name}}</strong>."
            />
          </RATypography>
          <RAInput
            label={t("configurations.dialogs.forkNewName")}
            fullWidth
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
          />
        </RABox>
      </RADialog>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "toast",
            color: toast.severity,
            message: toast.open ? toast.msg : "",
            onClose: () => setToast((current) => ({ ...current, open: false })),
          },
        ]}
      />
    </RABox>
  );
}
