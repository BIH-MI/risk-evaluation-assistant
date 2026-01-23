import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    fetchRecipientAssessmentsApi,
    addRecipientAssessmentApi,
    updateRecipientAssessmentApi,
    deleteRecipientAssessmentApi,
} from "api/recipientAssessments";

/** Fetch all recipient assessments (global). */
export const fetchRecipientAssessments = createAsyncThunk(
    "recipientAssessments/fetchAll",
    async (token, { rejectWithValue }) => {
        try {
            return await fetchRecipientAssessmentsApi(token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

/** Add a new recipient assessment under a specific recipient. */
export const addRecipientAssessment = createAsyncThunk(
    "recipientAssessments/addOne",
    async ({ recipientId, newAssessment, token }, { rejectWithValue }) => {
        try {
            return await addRecipientAssessmentApi(recipientId, newAssessment, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);


/** Update an existing recipient assessment (requires both IDs). */
export const updateRecipientAssessment = createAsyncThunk(
    "recipientAssessments/update",
    async ({ recipientId, assessmentId, updatedAssessment, token }, { rejectWithValue }) => {
        try {
            return await updateRecipientAssessmentApi(recipientId, assessmentId, updatedAssessment, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

/** Delete a recipient assessment (requires both IDs). */
export const deleteRecipientAssessment = createAsyncThunk(
    "recipientAssessments/delete",
    async ({ recipientId, assessmentId, token }, { rejectWithValue }) => {
        try {
            // No need to manually construct fullUrl anymore.
            // Just pass the IDs to the API function.
            await deleteRecipientAssessmentApi(recipientId, assessmentId, token);
            
            // Return the ID so the slice can remove it from the state
            return assessmentId;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);