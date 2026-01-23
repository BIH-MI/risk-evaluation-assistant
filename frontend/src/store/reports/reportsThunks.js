import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchReportsApi } from "api/report";


export const fetchReports = createAsyncThunk(
    "reports/fetchAll",
    async ( token, { rejectWithValue }) => {
        try {
            return await fetchReportsApi(token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);