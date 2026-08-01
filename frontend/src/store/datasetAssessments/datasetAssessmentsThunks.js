// src/store/datasetAssessments/datasetAssessmentsThunks.js
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
    fetchDatasetAssessmentsApi,
    fetchDatasetAssessmentsByDatasetIdApi,
    addDatasetAssessmentApi,
    updateDatasetAssessmentApi,
    deleteDatasetAssessmentApi,
    copyDatasetAssessmentApi,
} from "../../api/datasetAssessments";

// Fetch all assessments (no datasetId)
export const fetchDatasetAssessments = createAsyncThunk(
    "datasetAssessments/fetchAll",
    async (token, { rejectWithValue }) => {
        try {
            return await fetchDatasetAssessmentsApi(token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);


// If you still need the per‐dataset action, keep it separate:
export const fetchDatasetAssessmentsByDatasetId = createAsyncThunk(
    "datasetAssessments/fetchByDatasetId",
    async ({ datasetId, token }, { rejectWithValue }) => {
        try {
            return await fetchDatasetAssessmentsByDatasetIdApi(datasetId, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);


// Add a new assessment to a dataset
export const addDatasetAssessment = createAsyncThunk(
    "datasetAssessments/addOne",
    async ({ datasetId, newAssessment, token }, { rejectWithValue }) => {
        try {
            return await addDatasetAssessmentApi(datasetId, newAssessment, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);


export const copyDatasetAssessment = createAsyncThunk(
    "datasetAssessments/copyOne",
    async ({ datasetId, assessmentId, token }, { rejectWithValue }) => {
        try {
            return await copyDatasetAssessmentApi(datasetId, assessmentId, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Update an existing assessment
export const updateDatasetAssessment = createAsyncThunk(
    "datasetAssessments/updateOne",
    async ({ datasetId, assessmentId, updatedAssessment, token }, { rejectWithValue }) => {
        try {
            return await updateDatasetAssessmentApi(datasetId, assessmentId, updatedAssessment, token);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// Delete an assessment
export const deleteDatasetAssessment = createAsyncThunk(
    "datasetAssessments/deleteOne",
    async ({ datasetId, assessmentId, token }, { rejectWithValue }) => {
        try {
            await deleteDatasetAssessmentApi(datasetId, assessmentId, token);
            return assessmentId;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);
