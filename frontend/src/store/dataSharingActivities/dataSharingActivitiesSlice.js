// src/store/dataSharingActivities/dataSharingActivitiesSlice.js

import { createSlice } from "@reduxjs/toolkit";
import {
    fetchDataSharingActivities,
    fetchDataSharingActivityById,
    createDataSharingActivity,
    updateDataSharingActivity,
    deleteDataSharingActivity,
} from "./dataSharingActivitiesThunks";

const initialState = {
    items: [],           // All activities
    current: null,       // Single fetched activity (by ID)
    status: "idle",      // "idle" | "loading" | "succeeded" | "failed"
    error: null,         // Error message, if any
};

const dataSharingActivitiesSlice = createSlice({
    name: "dataSharingActivities",
    initialState,
    reducers: {
        // If you need synchronous actions, add them here.
    },
    extraReducers: (builder) => {
        // Fetch all activities
        builder
            .addCase(fetchDataSharingActivities.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchDataSharingActivities.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(fetchDataSharingActivities.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });

        // Fetch one activity by ID
        builder
            .addCase(fetchDataSharingActivityById.pending, (state) => {
                state.status = "loading";
                state.error = null;
                state.current = null;
            })
            .addCase(fetchDataSharingActivityById.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.current = action.payload;
            })
            .addCase(fetchDataSharingActivityById.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });

        // Create a new activity
        builder
            .addCase(createDataSharingActivity.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(createDataSharingActivity.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items.push(action.payload);
            })
            .addCase(createDataSharingActivity.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });

        // Update an existing activity
        builder
            .addCase(updateDataSharingActivity.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(updateDataSharingActivity.fulfilled, (state, action) => {
                state.status = "succeeded";
                const updated = action.payload;
                // Replace in items array
                const index = state.items.findIndex((a) => a.id === updated.id);
                if (index !== -1) {
                    state.items[index] = updated;
                }
                // If currently selected matches, update it too
                if (state.current && state.current.id === updated.id) {
                    state.current = updated;
                }
            })
            .addCase(updateDataSharingActivity.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });

        // Delete an activity
        builder
            .addCase(deleteDataSharingActivity.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(deleteDataSharingActivity.fulfilled, (state, action) => {
                state.status = "succeeded";
                const id = action.payload;
                state.items = state.items.filter((a) => a.id !== id);
                // If current was deleted, clear it
                if (state.current && state.current.id === id) {
                    state.current = null;
                }
            })
            .addCase(deleteDataSharingActivity.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });
    },
});

export default dataSharingActivitiesSlice.reducer;
