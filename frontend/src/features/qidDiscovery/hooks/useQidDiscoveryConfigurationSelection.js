import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getQidConfigurationValidationError } from "../validation/qidConfigurationValidation";
import { selectQidConfigurationsState } from "../state/qidDiscoverySelectors";
import { fetchQidDiscoveryConfigurations } from "../state/qidDiscoveryThunks";

/** Caches backend metadata in Redux and keeps this form's selection local. */
export function useQidDiscoveryConfigurationSelection(token) {
  const dispatch = useDispatch();
  const {
    items: configurations,
    status,
    error,
  } = useSelector(selectQidConfigurationsState);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState("");

  useEffect(() => {
    if (token) dispatch(fetchQidDiscoveryConfigurations({ token }));
  }, [dispatch, token]);

  useEffect(() => {
    setSelectedConfigurationId((current) => {
      if (
        configurations.some(
          (configuration) => String(configuration.id) === current
        )
      )
        return current;
      const defaultConfiguration =
        configurations.find(
          (configuration) => configuration.defaultConfiguration
        ) || configurations[0];
      return defaultConfiguration ? String(defaultConfiguration.id) : "";
    });
  }, [configurations]);

  const selectedConfiguration =
    configurations.find(
      (configuration) =>
        String(configuration.id) === String(selectedConfigurationId)
    ) || null;

  return {
    configurations,
    selectedConfiguration,
    selectedConfigurationId,
    setSelectedConfigurationId,
    selectedConfigurationError: selectedConfiguration
      ? getQidConfigurationValidationError(selectedConfiguration)
      : "",
    loading: status === "loading",
    loadFailed: status === "failed",
    loadError: error || "",
  };
}
