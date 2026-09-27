import { createSlice } from "@reduxjs/toolkit";
import {
  createProject,
  deleteProject,
  fetchProjectById,
  fetchProjects,
  updateProject,
} from "./projectsThunks";

const initialState = {
  items: [],
  current: null,
  status: "idle",
  error: null,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.current = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.current = action.payload;
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index === -1) {
          state.items.push(action.payload);
        } else {
          state.items[index] = action.payload;
        }
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(createProject.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items.push(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(updateProject.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        const index = state.items.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.current?.id === action.payload.id) {
          state.current = action.payload;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(deleteProject.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.current?.id === action.payload) {
          state.current = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default projectsSlice.reducer;
