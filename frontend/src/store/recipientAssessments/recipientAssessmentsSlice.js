// ── src/store/recipientAssessments/recipientAssessmentsSlice.js ──
import { createSlice } from "@reduxjs/toolkit";
import {
    fetchRecipientAssessments,
    addRecipientAssessment,
    updateRecipientAssessment,
    deleteRecipientAssessment
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
            })
            .addCase(fetchRecipientAssessments.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload; // expecting an array from API
            })
            .addCase(fetchRecipientAssessments.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload || action.error.message;
            })

            // — add
            .addCase(addRecipientAssessment.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })

            // — update
            .addCase(updateRecipientAssessment.fulfilled, (state, action) => {
                const updated = action.payload;
                const idx = state.items.findIndex((a) => a.id === updated.id);
                if (idx >= 0) state.items[idx] = updated;
            })

            // — delete
            .addCase(deleteRecipientAssessment.fulfilled, (state, action) => {
                const deletedId = action.payload;
                state.items = state.items.filter((a) => a.id !== deletedId);
            });
    },
});

export default recipientAssessmentsSlice.reducer;
