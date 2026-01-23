import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    fetchRecipientsApi,
    addRecipientApi,
    updateRecipientApi,
    deleteRecipientApi,
} from "api/recipients";

export const fetchRecipients = createAsyncThunk(
    "recipients/fetchRecipients",
    async (token, { rejectWithValue }) => {
        try {
            return await fetchRecipientsApi(token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const addRecipient = createAsyncThunk(
    "recipients/addRecipient",
    async ({ newRecipient, token }, { rejectWithValue }) => {
        try {
            return await addRecipientApi(newRecipient, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const updateRecipient = createAsyncThunk(
    "recipients/updateRecipient",
    async ({ id, updatedRecipient, token }, { rejectWithValue }) => {
        try {
            return await updateRecipientApi(id, updatedRecipient, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const deleteRecipient = createAsyncThunk(
    "recipients/deleteRecipient",
    async ({ id, token }, { rejectWithValue }) => {
        try {
            await deleteRecipientApi(id, token);
            return id;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);
