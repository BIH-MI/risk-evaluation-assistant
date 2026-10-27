import { createSlice } from "@reduxjs/toolkit";
import {
  fetchQidDiscoveryConfigurations,
  fetchAiModelInstallations,
  installAiModel,
} from "./qidDiscoveryThunks";

// Backend metadata only: never store uploaded tables, classification results,
// CSV previews, worker handles or encoded columns in either resource.
const resourceState = () => ({
  items: [],
  status: "idle",
  error: null,
  requestId: null,
});
const initialState = {
  configurations: resourceState(),
  modelInstallations: resourceState(),
};

const qidDiscoverySlice = createSlice({
  name: "qidDiscovery",
  initialState,
  reducers: {
    invalidateQidConfigurations(state) {
      // Invalidates an in-flight snapshot as well as a previously cached list.
      state.configurations = resourceState();
    },
    resetQidDiscoveryMetadata: () => initialState,
  },
  extraReducers(builder) {
    // Pending requests own a resource by requestId. Reset/invalidation or a newer
    // installation can revoke ownership before a response arrives.
    const addResource = (thunk, key) => {
      builder
        .addCase(thunk.pending, (state, action) => {
          const resource = state[key];
          resource.status = "loading";
          resource.error = null;
          resource.requestId = action.meta.requestId;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          const resource = state[key];
          if (resource.requestId !== action.meta.requestId) return;
          resource.items = action.payload;
          resource.status = "succeeded";
          resource.requestId = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          const resource = state[key];
          if (resource.requestId !== action.meta.requestId) return;
          resource.status = "failed";
          resource.error = action.payload || action.error.message;
          resource.requestId = null;
        });
    };
    addResource(fetchQidDiscoveryConfigurations, "configurations");
    addResource(fetchAiModelInstallations, "modelInstallations");
    builder.addCase(installAiModel.fulfilled, (state, action) => {
      const resource = state.modelInstallations;
      resource.items = resource.items.filter(
        (entry) => entry.modelId !== action.payload.modelId
      );
      resource.items.push(action.payload);
      resource.status = "succeeded";
      resource.error = null;
      // An older status response must not overwrite a newly started installation.
      resource.requestId = null;
    });
  },
});

export const { invalidateQidConfigurations, resetQidDiscoveryMetadata } =
  qidDiscoverySlice.actions;
export default qidDiscoverySlice.reducer;
