import { createSlice } from "@reduxjs/toolkit";
import { fetchReports } from "./reportsThunks";

const reportsSlice = createSlice({
    name: "reports",
    initialState: {
        items: [],
        current: null,
        status: "idle",
        error: null,
    },
    extraReducers: builder => {
        builder
            .addCase(fetchReports.pending, (state) => {
                state.loading = "loading";
                state.error = null;
            })
            .addCase(fetchReports.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.items = action.payload;
            })
            .addCase(fetchReports.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.payload;
            });
    }
});

export default reportsSlice.reducer;
