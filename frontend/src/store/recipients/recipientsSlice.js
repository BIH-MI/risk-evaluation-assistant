import { createSlice } from "@reduxjs/toolkit";
import {
    fetchRecipients,
    addRecipient,
    updateRecipient,
    deleteRecipient,
} from "./recipientsThunks";

const recipientsSlice = createSlice({
    name: "recipients",
    initialState: {
        items: [],
        status: "idle",
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // fetch
            .addCase(fetchRecipients.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchRecipients.fulfilled, (state, action) => {
                state.items = action.payload;
                state.status = "succeeded";
            })
            .addCase(fetchRecipients.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })

            // add
            .addCase(addRecipient.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(addRecipient.fulfilled, (state, action) => {
                state.items.push(action.payload);
                state.status = "succeeded";
            })
            .addCase(addRecipient.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })

            // update
            .addCase(updateRecipient.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(updateRecipient.fulfilled, (state, action) => {
                const idx = state.items.findIndex((r) => r.id === action.payload.id);
                if (idx !== -1) state.items[idx] = action.payload;
                state.status = "succeeded";
            })
            .addCase(updateRecipient.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            })

            // delete
            .addCase(deleteRecipient.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(deleteRecipient.fulfilled, (state, action) => {
                state.items = state.items.filter((r) => r.id !== action.payload);
                state.status = "succeeded";
            })
            .addCase(deleteRecipient.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });
    },
});

export default recipientsSlice.reducer;
