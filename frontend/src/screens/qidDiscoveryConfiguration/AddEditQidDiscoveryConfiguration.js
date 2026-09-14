import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { CircularProgress } from "@mui/material";

import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import { isAdminUser } from "utils/auth";
import {
  createQidDiscoveryConfigurationApi,
  fetchQidDiscoveryConfigurationApi,
  fetchQidDiscoveryConfigurationsApi,
  updateQidDiscoveryConfigurationApi,
} from "api/qidDiscoveryConfigurations";

import BeamSearchSection from "./components/BeamSearchSection";
import CandidateRankingSection from "./components/CandidateRankingSection";
import ConfigurationDetailsSection from "./components/ConfigurationDetailsSection";
import ResultRetentionSection from "./components/ResultRetentionSection";
import SearchStrategySection from "./components/SearchStrategySection";
import SearchTargetsSection from "./components/SearchTargetsSection";
import {
  emptyQidDiscoveryConfigurationForm,
  hasQidConfigurationFormErrors,
  normalizeQidConfigurationToForm,
  qidConfigurationFormToPayload,
  validateQidConfigurationForm,
} from "./qidDiscoveryConfigurationUtils";

export default function AddEditQidDiscoveryConfiguration() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language?.split("-")[0] || "en";
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const isEditMode = Boolean(id);

  const [configurations, setConfigurations] = useState([]);
  const [form, setForm] = useState(() => emptyQidDiscoveryConfigurationForm());
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token || !isAdmin) return undefined;

    let mounted = true;
    const loadEditorData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [configurationData, configuration] = await Promise.all([
          fetchQidDiscoveryConfigurationsApi(token),
          isEditMode ? fetchQidDiscoveryConfigurationApi(id, token) : null,
        ]);

        if (!mounted) return;
        setConfigurations(
          Array.isArray(configurationData) ? configurationData : []
        );
        setForm(
          configuration
            ? normalizeQidConfigurationToForm(configuration)
            : emptyQidDiscoveryConfigurationForm()
        );
        setShowErrors(false);
      } catch (error) {
        if (mounted) {
          setErrorMsg(
            error.message ||
              t("qidDiscoveryConfiguration.alerts.loadConfigurationFailed")
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadEditorData();

    return () => {
      mounted = false;
    };
  }, [id, isAdmin, isEditMode, t, token]);

  // currentLanguage isn't read directly here, but validateQidConfigurationForm
  // translates its messages via t, so it must stay a dependency to re-run
  // validation (and refresh already-shown errors) on language switch.
  const validationErrors = useMemo(
    () => validateQidConfigurationForm(t, form, configurations),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configurations, form, currentLanguage]
  );
  const hasErrors = hasQidConfigurationFormErrors(validationErrors);

  const updateField = useCallback((field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const updateSearchField = useCallback((field, value) => {
    setForm((previous) => ({
      ...previous,
      search: {
        ...previous.search,
        [field]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setShowErrors(true);
    if (hasErrors || !token || saving) return;

    setSaving(true);
    try {
      const payload = qidConfigurationFormToPayload(form);
      if (form.id) {
        await updateQidDiscoveryConfigurationApi(form.id, payload, token);
      } else {
        await createQidDiscoveryConfigurationApi(payload, token);
      }
      navigate("/configuration/qid-discovery");
    } catch (error) {
      setErrorMsg(
        error.message ||
          t("qidDiscoveryConfiguration.alerts.saveConfigurationFailed")
      );
    } finally {
      setSaving(false);
    }
  }, [form, hasErrors, navigate, saving, t, token]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            {t("qidDiscoveryConfiguration.alerts.adminOnly")}
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

  const searchType = form.search.searchType;
  const usesBeam = searchType === "AUTOMATIC" || searchType === "BEAM";

  return (
    <RABox
      component="form"
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" &&
          event.target.tagName !== "TEXTAREA" &&
          event.target.tagName !== "BUTTON"
        ) {
          event.preventDefault();
        }
      }}
      display="flex"
      flexDirection="column"
      maxWidth="900px"
      width="100%"
      mx="auto"
      gap={2}
      p={2}
    >
      <RATypography variant="h4" fontWeight="bold" align="center">
        {isEditMode
          ? t("qidDiscoveryConfiguration.form.editTitle")
          : t("qidDiscoveryConfiguration.form.createTitle")}
      </RATypography>

      <ConfigurationDetailsSection
        form={form}
        errors={validationErrors.fields}
        showErrors={showErrors}
        onChange={updateField}
      />
      <SearchStrategySection
        search={form.search}
        errors={validationErrors.search}
        showErrors={showErrors}
        onChange={updateSearchField}
      />
      {usesBeam && (
        <BeamSearchSection
          search={form.search}
          errors={validationErrors.search}
          showErrors={showErrors}
          onChange={updateSearchField}
          searchType={searchType}
        />
      )}
      <SearchTargetsSection
        search={form.search}
        errors={validationErrors.search}
        showErrors={showErrors}
        onChange={updateSearchField}
        searchType={searchType}
      />
      <CandidateRankingSection
        search={form.search}
        errors={validationErrors.search}
        showErrors={showErrors}
        onChange={updateSearchField}
        searchType={searchType}
      />
      <ResultRetentionSection
        search={form.search}
        errors={validationErrors.search}
        showErrors={showErrors}
        onChange={updateSearchField}
      />

      <RABox display="flex" justifyContent="center" mt={2}>
        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          disabled={saving}
          sx={{ minWidth: 160 }}
        >
          {saving
            ? t("qidDiscoveryConfiguration.form.saving")
            : t("qidDiscoveryConfiguration.form.save")}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "errorMsg",
            color: "error",
            message: errorMsg,
            onClose: () => setErrorMsg(""),
          },
        ]}
      />
    </RABox>
  );
}
