// ── src/store/recipientAssessments/recipientAssessmentsSlice.js ──
import { createSlice } from "@reduxjs/toolkit";
import {
    fetchRecipientAssessments,
    addRecipientAssessment,
    updateRecipientAssessment,
    deleteRecipientAssessment,
    fetchRecipientAssessmentsByRecipientId,
} from "./recipientAssessmentsThunks";

const initialState = {
    items: [],      // array of recipientAssessment objects
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
};

const recipientAssessmentsSlice = createSlice({
    name: "recipientAssessments",
    initialState,
    reducers: {
        // (you can add synchronous reducers here if needed)
    },
    extraReducers: (builder) => {
        builder
            // — fetch all
            .addCase(fetchRecipientAssessments.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchRecipientAssessments.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload; // expecting an array from API
            })
            .addCase(fetchRecipientAssessmentsByRecipientId.fulfilled, (state, action) => {
                  state.status = "succeeded";
                  state.items = action.payload;
            })
            .addCase(fetchRecipientAssessments.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            })
            .addCase(fetchRecipientAssessmentsByRecipientId.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchRecipientAssessmentsByRecipientId.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            })
            // — add
            .addCase(addRecipientAssessment.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(addRecipientAssessment.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items.push(action.payload);
            })
            .addCase(addRecipientAssessment.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            })

            // — update
            .addCase(updateRecipientAssessment.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(updateRecipientAssessment.fulfilled, (state, action) => {
                state.status = "succeeded";
                const updated = action.payload;
                const idx = state.items.findIndex((a) => a.id === updated.id);
                if (idx >= 0) state.items[idx] = updated;
            })
            .addCase(updateRecipientAssessment.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            })

            // — delete
            .addCase(deleteRecipientAssessment.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(deleteRecipientAssessment.fulfilled, (state, action) => {
                state.status = "succeeded";
                const deletedId = action.payload;
                state.items = state.items.filter((a) => a.id !== deletedId);
            })
            .addCase(deleteRecipientAssessment.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            });
    },
});

export default recipientAssessmentsSlice.reducer;
