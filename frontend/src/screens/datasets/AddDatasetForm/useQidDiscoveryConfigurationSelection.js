import { useEffect, useMemo, useState } from "react";

import { fetchQidDiscoveryConfigurationsApi } from "api/qidDiscoveryConfigurations";
import { getQidConfigurationValidationError } from "qidDiscovery";

export function useQidDiscoveryConfigurationSelection(token) {
  const [configurations, setConfigurations] = useState([]);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!token) return undefined;

    let mounted = true;

    const loadConfigurations = async () => {
      setLoading(true);
      setLoadFailed(false);
      setLoadError("");

      try {
        const data = await fetchQidDiscoveryConfigurationsApi(token, {
          activeOnly: true,
        });
        if (!mounted) return;

        const activeConfigurations = Array.isArray(data) ? data : [];
        setConfigurations(activeConfigurations);
        setSelectedConfigurationId((current) => {
          if (
            current &&
            activeConfigurations.some(
              (configuration) => String(configuration.id) === String(current)
            )
          ) {
            return current;
          }

          const defaultConfiguration =
            activeConfigurations.find(
              (configuration) => configuration.defaultConfiguration
            ) || activeConfigurations[0];

          return defaultConfiguration ? String(defaultConfiguration.id) : "";
        });
      } catch (error) {
        if (mounted) {
          setLoadFailed(true);
          setLoadError(error?.message || "");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadConfigurations();

    return () => {
      mounted = false;
    };
  }, [token]);

  const selectedConfiguration = useMemo(
    () =>
      configurations.find(
        (configuration) =>
          String(configuration.id) === String(selectedConfigurationId)
      ) || null,
    [configurations, selectedConfigurationId]
  );

  const selectedConfigurationError = useMemo(() => {
    if (!selectedConfiguration) return "";
    return getQidConfigurationValidationError(selectedConfiguration);
  }, [selectedConfiguration]);

  return {
    configurations,
    selectedConfiguration,
    selectedConfigurationId,
    setSelectedConfigurationId,
    selectedConfigurationError,
    loading,
    loadFailed,
    loadError,
  };
}
