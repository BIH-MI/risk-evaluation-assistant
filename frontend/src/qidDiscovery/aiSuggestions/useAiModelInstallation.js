import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchAiModelsApi, installAiModelApi } from "api/aiModels";

import {
  AI_INSTALL_STATES,
  describeModelInstallations,
} from "./aiScreeningConfiguration";

const POLL_INTERVAL_MS = 2000;

/**
 * Installation status of the AI models in this deployment, refreshed while
 * an installation is running. `installation` is null while loading; a status
 * that could not be loaded is reported as `{ status: "error", error }`, never
 * as "nothing installed", so callers can tell the two apart.
 */
export function useAiModelInstallation(token) {
  const [result, setResult] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const statuses = await fetchAiModelsApi(token);
      if (mountedRef.current) setResult({ status: "ok", error: null, statuses });
    } catch (error) {
      if (mountedRef.current) {
        setResult({ status: "error", error: error.message || "", statuses: [] });
      }
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const installation = useMemo(
    () =>
      result && {
        status: result.status,
        error: result.error,
        ...describeModelInstallations(result.statuses),
      },
    [result]
  );

  const installing = Object.values(installation?.models || {}).some(
    (model) => model.state === AI_INSTALL_STATES.INSTALLING
  );
  useEffect(() => {
    if (!installing) return undefined;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [installing, refresh]);

  /** Starts an installation; rejects with the backend's message on failure. */
  const install = useCallback(
    async (modelId) => {
      const status = await installAiModelApi(modelId, token);
      if (!mountedRef.current) return;
      setResult((current) => ({
        status: "ok",
        error: null,
        statuses: [
          ...(current?.statuses || []).filter((entry) => entry.modelId !== status.modelId),
          status,
        ],
      }));
    },
    [token]
  );

  return { installation, refresh, install };
}
