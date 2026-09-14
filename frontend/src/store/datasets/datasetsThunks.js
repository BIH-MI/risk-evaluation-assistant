import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  addDatasetApi,
  deleteDatasetApi,
  fetchDatasetsApi,
  updateDatasetApi,
} from "api/datasets/index";

export const fetchDatasets = createAsyncThunk(
  "datasets/fetchDatasets",
  async (token, { rejectWithValue }) => {
    try {
      return await fetchDatasetsApi(token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add a new dataset
export const addDataset = createAsyncThunk(
  "datasets/addDataset",
  async ({ newDataset, token }, { rejectWithValue }) => {
    try {
      return await addDatasetApi(newDataset, token);
    } catch (error) {
      return rejectWithValue({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
  }
);

// Update an existing dataset
export const updateDataset = createAsyncThunk(
  "datasets/updateDataset",
  async ({ datasetId, updatedDataset, token }, { rejectWithValue }) => {
    try {
      return await updateDatasetApi(datasetId, updatedDataset, token);
    } catch (error) {
      return rejectWithValue({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
  }
);

// Delete dataset
export const deleteDataset = createAsyncThunk(
  "datasets/deleteDataset",
  async ({ datasetId, token }, { rejectWithValue }) => {
    try {
      return await deleteDatasetApi(datasetId, token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
