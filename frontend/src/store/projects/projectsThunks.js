import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  createProjectApi,
  deleteProjectApi,
  fetchProjectByIdApi,
  fetchProjectsApi,
  updateProjectApi,
} from "api/projects";

export const fetchProjects = createAsyncThunk(
  "projects/fetchAll",
  async (token, { rejectWithValue }) => {
    try {
      return await fetchProjectsApi(token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  "projects/fetchById",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      return await fetchProjectByIdApi(id, token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createProject = createAsyncThunk(
  "projects/create",
  async ({ newProject, token }, { rejectWithValue }) => {
    try {
      return await createProjectApi(newProject, token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async ({ id, updatedProject, token }, { rejectWithValue }) => {
    try {
      return await updateProjectApi(id, updatedProject, token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProject = createAsyncThunk(
  "projects/delete",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      await deleteProjectApi(id, token);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
