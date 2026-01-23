import { createSlice } from "@reduxjs/toolkit";
import {
  addDataset,
  deleteDataset,
  fetchDatasets,
  updateDataset,
} from "./datasetsThunks";

const datasetsSlice = createSlice({
  name: "datasets",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handling the fetchDatasets actions
      .addCase(fetchDatasets.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDatasets.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchDatasets.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // Handling the addDataset actions
      .addCase(addDataset.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addDataset.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.status = "succeeded";
      })
      .addCase(addDataset.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // Handling the deleteDataset actions
      .addCase(deleteDataset.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteDataset.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.id !== action.meta.arg.datasetId
        );
        state.status = "succeeded";
      })
      .addCase(deleteDataset.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })

      // Handling the updateDataset actions
      .addCase(updateDataset.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateDataset.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.status = "succeeded";
      })
      .addCase(updateDataset.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default datasetsSlice.reducer;
