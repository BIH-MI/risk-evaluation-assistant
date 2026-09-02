import { useCallback, useEffect, useState } from "react";

import {
  archiveQidDiscoveryConfigurationApi,
  duplicateQidDiscoveryConfigurationApi,
  fetchQidDiscoveryConfigurationsApi,
  setDefaultQidDiscoveryConfigurationApi,
} from "api/qidDiscoveryConfigurations";

export default function useQidDiscoveryConfiguration(token) {
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
        error.message || "Failed to load QID discovery configurations."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

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
          error.message || "Failed to duplicate QID discovery configuration."
        );
      }
    },
    [loadConfigurations, token]
  );

  const setDefaultConfiguration = useCallback(
    async (configuration) => {
      if (!token) return;
      try {
        await setDefaultQidDiscoveryConfigurationApi(configuration.id, token);
        await loadConfigurations();
      } catch (error) {
        setErrorMsg(
          error.message || "Failed to set default QID discovery configuration."
        );
      }
    },
    [loadConfigurations, token]
  );

  const archiveConfiguration = useCallback(
    async (configuration) => {
      if (!token) return;
      try {
        await archiveQidDiscoveryConfigurationApi(configuration.id, token);
        await loadConfigurations();
      } catch (error) {
        setErrorMsg(
          error.message || "Failed to archive QID discovery configuration."
        );
      }
    },
    [loadConfigurations, token]
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
