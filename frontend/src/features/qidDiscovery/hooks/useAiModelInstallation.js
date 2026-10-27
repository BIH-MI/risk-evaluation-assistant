import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectAiModelInstallation } from "../state/qidDiscoverySelectors";
import {
  fetchAiModelInstallations,
  installAiModel,
} from "../state/qidDiscoveryThunks";

/** Shared deployment metadata; model weights and classification stay outside Redux. */
export function useAiModelInstallation(token) {
  const dispatch = useDispatch();
  const installation = useSelector(selectAiModelInstallation);

  useEffect(() => {
    if (token) dispatch(fetchAiModelInstallations({ token }));
  }, [dispatch, token]);

  const refresh = useCallback(
    () => dispatch(fetchAiModelInstallations({ token, force: true })),
    [dispatch, token]
  );
  const install = useCallback(
    (modelId) => dispatch(installAiModel({ modelId, token })).unwrap(),
    [dispatch, token]
  );
  return { installation, refresh, install };
}
