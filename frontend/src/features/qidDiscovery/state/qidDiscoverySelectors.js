import { createSelector } from "@reduxjs/toolkit";
import {
  AI_INSTALL_STATES,
  describeModelInstallations,
} from "../ai/aiScreeningConfiguration";

export const selectQidConfigurationsState = (state) =>
  state.qidDiscovery.configurations;
export const selectAiModelInstallationsState = (state) =>
  state.qidDiscovery.modelInstallations;

/**
 * Returns null until an initial response, then the UI installation description.
 * Keep cached entries during refresh; status="error" distinguishes a failed read
 * from a successful response with no installed models. Revision checks live in
 * describeModelInstallations, not in the screen.
 */
export const selectAiModelInstallation = createSelector(
  [selectAiModelInstallationsState],
  ({ items, status, error }) => {
    if (status === "idle" || (status === "loading" && !items.length))
      return null;
    return {
      status: status === "failed" ? "error" : "ok",
      error,
      ...describeModelInstallations(items),
    };
  }
);

export const selectIsInstallingAiModel = (state) =>
  state.qidDiscovery.modelInstallations.items.some(
    (model) => model.state === AI_INSTALL_STATES.INSTALLING
  );
