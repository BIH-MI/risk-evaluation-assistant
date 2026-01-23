// src/store/dataSharingActivities/dataSharingActivitiesThunks.js

import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    fetchDataSharingActivitiesApi,
    fetchDataSharingActivityByIdApi,
    createDataSharingActivityApi,
    updateDataSharingActivityApi,
    deleteDataSharingActivityApi,
} from "api/dataSharingActivities";

/** Fetch all data sharing activities */
export const fetchDataSharingActivities = createAsyncThunk(
    "dataSharingActivities/fetchAll",
    async ( token, { rejectWithValue }) => {
        try {
            return await fetchDataSharingActivitiesApi(token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

/** Fetch one data sharing activity by ID */
export const fetchDataSharingActivityById = createAsyncThunk(
    "dataSharingActivities/fetchById",
    async ({ id, token }, { rejectWithValue }) => {
        try {
            return await fetchDataSharingActivityByIdApi(id, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

/** Create a new data sharing activity */
export const createDataSharingActivity = createAsyncThunk(
    "dataSharingActivities/create",
    async ({ newActivity, token }, { rejectWithValue }) => {
        try {
            return await createDataSharingActivityApi(newActivity, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

/** Update an existing data sharing activity */
export const updateDataSharingActivity = createAsyncThunk(
    "dataSharingActivities/update",
    async ({ id, updatedActivity, token }, { rejectWithValue }) => {
        try {
            return await updateDataSharingActivityApi(id, updatedActivity, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

/** Delete a data sharing activity */
export const deleteDataSharingActivity = createAsyncThunk(
    "dataSharingActivities/delete",
    async ({ id, token }, { rejectWithValue }) => {
        try {
            await deleteDataSharingActivityApi(id, token);
            return id;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);
