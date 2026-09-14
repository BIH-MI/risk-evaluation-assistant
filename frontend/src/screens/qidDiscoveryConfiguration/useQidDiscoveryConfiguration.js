import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  archiveQidDiscoveryConfigurationApi,
  duplicateQidDiscoveryConfigurationApi,
  fetchQidDiscoveryConfigurationsApi,
  setDefaultQidDiscoveryConfigurationApi,
} from "api/qidDiscoveryConfigurations";

export default function useQidDiscoveryConfiguration(token) {
  const { t } = useTranslation();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadConfigurations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchQidDiscoveryConfigurationsApi(token);
      setConfigurations(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMsg(
        error.message ||
          t("qidDiscoveryConfiguration.alerts.loadConfigurationsFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  const duplicateConfiguration = useCallback(
    async (configuration) => {
      if (!token) return;
      try {
        await duplicateQidDiscoveryConfigurationApi(configuration.id, token);
        await loadConfigurations();
      } catch (error) {
        setErrorMsg(
          error.message ||
            t("qidDiscoveryConfiguration.alerts.duplicateConfigurationFailed")
        );
      }
    },
    [loadConfigurations, t, token]
  );

  const setDefaultConfiguration = useCallback(
    async (configuration) => {
      if (!token) return;
      try {
        await setDefaultQidDiscoveryConfigurationApi(configuration.id, token);
        await loadConfigurations();
      } catch (error) {
        setErrorMsg(
          error.message ||
            t("qidDiscoveryConfiguration.alerts.setDefaultConfigurationFailed")
        );
      }
    },
    [loadConfigurations, t, token]
  );

  const archiveConfiguration = useCallback(
    async (configuration) => {
      if (!token) return;
      try {
        await archiveQidDiscoveryConfigurationApi(configuration.id, token);
        await loadConfigurations();
      } catch (error) {
        setErrorMsg(
          error.message ||
            t("qidDiscoveryConfiguration.alerts.archiveConfigurationFailed")
        );
      }
    },
    [loadConfigurations, t, token]
  );

  return {
    configurations,
    loading,
    errorMsg,
    setErrorMsg,
    loadConfigurations,
    duplicateConfiguration,
    setDefaultConfiguration,
    archiveConfiguration,
  };
}
