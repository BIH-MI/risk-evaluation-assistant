import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import {
  fetchAiModelInstallations,
  installAiModel,
} from "./qidDiscoveryThunks";
import { selectIsInstallingAiModel } from "./qidDiscoverySelectors";
import { resetQidDiscoveryMetadata } from "./qidDiscoverySlice";

export const aiModelInstallationListener = createListenerMiddleware();

// One store-owned delay serves every screen. A completed status request or
// installation action cancels the previous delay and schedules another only if
// cached status still includes INSTALLING. Failed reads also retry while that
// last-known installation is running; reset clears the status and cancels polling.
// The delay starts after a response, so two seconds is not a fixed request cadence.
aiModelInstallationListener.startListening({
  matcher: isAnyOf(
    fetchAiModelInstallations.fulfilled,
    fetchAiModelInstallations.rejected,
    installAiModel.fulfilled,
    resetQidDiscoveryMetadata
  ),
  async effect(action, listenerApi) {
    listenerApi.cancelActiveListeners();
    if (!selectIsInstallingAiModel(listenerApi.getState())) return;
    await listenerApi.delay(2000);
    if (!selectIsInstallingAiModel(listenerApi.getState())) return;
    listenerApi.dispatch(
      fetchAiModelInstallations({ token: action.meta.arg.token, force: true })
    );
  },
});
