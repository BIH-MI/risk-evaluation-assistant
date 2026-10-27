import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchQidDiscoveryConfigurationsApi } from "../api/qidDiscoveryApi";
import { fetchAiModelsApi, installAiModelApi } from "../api/aiModelsApi";

// Conditions deduplicate concurrent consumers and reuse successful responses.
// A force refresh bypasses a successful cache, but is skipped while loading.
// A condition-skipped dispatch does not return the existing request's payload;
// consumers observe the shared result through selectors.
const canFetch = (resource, force) =>
  resource.status !== "loading" && (force || resource.status !== "succeeded");

export const fetchQidDiscoveryConfigurations = createAsyncThunk(
  "qidDiscovery/fetchConfigurations",
  async ({ token }, { rejectWithValue }) => {
    try {
      const data = await fetchQidDiscoveryConfigurationsApi(token, {
        activeOnly: true,
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to load QID configurations"
      );
    }
  },
  {
    condition: ({ token, force = false }, { getState }) =>
      Boolean(token) && canFetch(getState().qidDiscovery.configurations, force),
  }
);

export const fetchAiModelInstallations = createAsyncThunk(
  "qidDiscovery/fetchModelInstallations",
  async ({ token }, { rejectWithValue }) => {
    try {
      return await fetchAiModelsApi(token);
    } catch (error) {
      return rejectWithValue(
        error.message || "Failed to load AI model installation status"
      );
    }
  },
  {
    condition: ({ token, force = false }, { getState }) =>
      Boolean(token) &&
      canFetch(getState().qidDiscovery.modelInstallations, force),
  }
);

export const installAiModel = createAsyncThunk(
  "qidDiscovery/installModel",
  async ({ modelId, token }, { rejectWithValue }) => {
    try {
      return await installAiModelApi(modelId, token);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to install AI model");
    }
  }
);
