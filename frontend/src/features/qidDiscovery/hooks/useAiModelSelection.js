import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";

import { resolveAiScreeningModels } from "features/qidDiscovery/ai/aiScreeningConfiguration";
import { useAiModelInstallation } from "features/qidDiscovery/hooks/useAiModelInstallation";

/**
 * AI model for Add Dataset, taken from the selected QID discovery
 * configuration (its aiScreening settings): the allowed models that are
 * supported and installed, preselecting the configured default. Researchers
 * choose when more than one model is usable; otherwise the default is used
 * automatically (see resolveAiScreeningModels).
 *
 * `selectedModelId` is null when AI screening is disabled, no allowed model
 * is usable, or the default is unusable and the researcher has not chosen
 * another model; AI suggestions then report themselves as unavailable.
 * `locked` (tables exist): the selection is never changed automatically.
 *
 * `unavailableReason` explains why the configured default cannot be used
 * ({ modelId, reason, detail }): not supported by this build, not installed,
 * or the installation status could not be loaded. No other model is used
 * instead.
 */
export function useAiModelSelection(
  qidDiscoveryConfiguration,
  { locked = false } = {}
) {
  const { user } = useAuth();
  const { installation } = useAiModelInstallation(user?.access_token);
  const [selectedModelId, setSelectedModelIdState] = useState(null);
  // Configuration id for which the researcher chose a model explicitly.
  // Only such a choice is kept; an automatic preselection always follows
  // the selected configuration's default.
  const explicitChoiceRef = useRef(null);
  const configurationId = qidDiscoveryConfiguration?.id ?? null;

  const setSelectedModelId = useCallback(
    (modelId) => {
      if (locked) return;
      explicitChoiceRef.current = configurationId;
      setSelectedModelIdState(modelId);
    },
    [configurationId, locked]
  );

  const loading = installation === null;
  const resolved = useMemo(
    () =>
      resolveAiScreeningModels(
        qidDiscoveryConfiguration,
        installation?.installedModelIds || []
      ),
    [installation, qidDiscoveryConfiguration]
  );

  const unavailableReason = useMemo(() => {
    const modelId = resolved.configuredDefaultModelId;
    if (loading || !resolved.enabled || !modelId) return null;
    if (resolved.models.some((model) => model.id === modelId)) return null;
    if (installation.status !== "ok") {
      return {
        modelId,
        reason: "statusUnknown",
        detail: installation.error || "",
      };
    }
    const status = installation.models[modelId];
    if (!status) return { modelId, reason: "unsupported", detail: "" };
    return {
      modelId,
      reason: status.state === "FAILED" ? "installFailed" : "notInstalled",
      detail: status.error || "",
    };
  }, [installation, loading, resolved]);

  // Follow the configuration's default until tables exist; keep the
  // researcher's explicit choice for this configuration while it is offered.
  useEffect(() => {
    if (loading || locked) return;
    const explicit = explicitChoiceRef.current === configurationId;
    setSelectedModelIdState((current) =>
      explicit &&
      resolved.allowSelection &&
      resolved.models.some((model) => model.id === current)
        ? current
        : resolved.defaultModelId
    );
  }, [configurationId, loading, locked, resolved]);

  return {
    enabled: resolved.enabled,
    models: resolved.models,
    defaultModelId: resolved.defaultModelId,
    allowSelection: resolved.allowSelection,
    selectedModelId,
    setSelectedModelId,
    unavailableReason,
    loading,
  };
}
