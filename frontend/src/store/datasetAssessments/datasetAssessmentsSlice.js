import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDatasetAssessments,
  fetchDatasetAssessmentsByDatasetId,
  copyDatasetAssessment,
  addDatasetAssessment,
  updateDatasetAssessment,
  deleteDatasetAssessment,
} from "./datasetAssessmentsThunks";

const initialState = {
  items: [],      // array of assessments
  status: "idle",
  error: null,
};

const datasetAssessmentsSlice = createSlice({
  name: "datasetAssessments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
        // ── Fetch All ──────────────────────────────────────
        .addCase(fetchDatasetAssessments.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(fetchDatasetAssessments.fulfilled, (state, { payload }) => {
          state.status = "succeeded";
          state.items = payload;
        })
        .addCase(fetchDatasetAssessments.rejected, (state, { payload }) => {
          state.status = "failed";
          state.error = payload;
        })

        // ── Fetch By Dataset Id ──────────────────────────────────────
        .addCase(fetchDatasetAssessmentsByDatasetId.pending, (state) => {
            state.status = "loading";
            state.error = null;
        })
        .addCase(fetchDatasetAssessmentsByDatasetId.fulfilled, (state, { payload }) => {
            state.status = "succeeded";
            state.items = payload;
        })
        .addCase(fetchDatasetAssessmentsByDatasetId.rejected, (state, { payload }) => {
            state.status = "failed";
            state.error = payload;
        })

        // ── Add One ────────────────────────────────────────
        .addCase(addDatasetAssessment.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(addDatasetAssessment.fulfilled, (state, { payload }) => {
          state.status = "succeeded";
        })
        .addCase(addDatasetAssessment.rejected, (state, { payload }) => {
          state.status = "failed";
          state.error = payload;
        })

        // ── Copy One ─────────────────────────────────────────────
        .addCase(copyDatasetAssessment.pending, (state) => {
            state.status = "loading";
            state.error = null;
        })
        .addCase(copyDatasetAssessment.fulfilled, (state, { payload }) => {
            // payload is the newly created copy
            state.items.push(payload);
            state.status = "succeeded";
        })
        .addCase(copyDatasetAssessment.rejected, (state, { payload }) => {
            state.status = "failed";
            state.error = payload;
        })

        // ── Update One ─────────────────────────────────────
        .addCase(updateDatasetAssessment.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(updateDatasetAssessment.fulfilled, (state, { payload }) => {
          const idx = state.items.findIndex((a) => a.id === payload.id);
          if (idx !== -1) state.items[idx] = payload;
          state.status = "succeeded";
        })
        .addCase(updateDatasetAssessment.rejected, (state, { payload }) => {
          state.status = "failed";
          state.error = payload;
        })

        // ── Delete One ─────────────────────────────────────
        .addCase(deleteDatasetAssessment.pending, (state) => {
          state.status = "loading";
          state.error = null;
        })
        .addCase(deleteDatasetAssessment.fulfilled, (state, { payload }) => {
          state.items = state.items.filter((a) => a.id !== payload);
          state.status = "succeeded";
        })
        .addCase(deleteDatasetAssessment.rejected, (state, { payload }) => {
          state.status = "failed";
          state.error = payload;
        });
  },
});

export default datasetAssessmentsSlice.reducer;
