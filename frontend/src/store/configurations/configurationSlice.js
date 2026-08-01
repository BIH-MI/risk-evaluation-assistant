import { createSlice } from "@reduxjs/toolkit";
import {
  fetchConfigurations,
  createConfiguration,
  forkConfiguration,
  fetchConfiguration,
  updateConfiguration,
  deleteConfiguration,
} from "./configurationThunks";

const initialState = {
  items: [], // Array of full configuration objects
  status: "idle",
  configDetails: null, // Used only when editing a specific config
  loading: false,
  error: null,
  saveSuccess: false,
};

const configurationSlice = createSlice({
  name: "configuration",
  initialState,
  reducers: {
    resetConfigurationState: (state) => {
      state.configDetails = null;
      state.loading = false;
      state.error = null;
      state.saveSuccess = false;
    },
    resetSaveSuccess: (state) => {
      state.saveSuccess = false;
    },

    setFullConfig: (state, action) => {
      // When the user opens the editor, we load the entire object
      state.configDetails = action.payload;
    },

    updateConfigurationField: (state, action) => {
      const { field, value } = action.payload;
      if (
        [
          "name",
          "description",
          "source",
          "riskFormula",
          "version",
          "defaultLanguage",
          "sharedUsernames",
        ].includes(field)
      ) {
        if (state.configDetails) state.configDetails[field] = value;
      }
    },

    // Category Editors
    addCategory: (state, action) => {
      if (state.configDetails) {
        if (!state.configDetails.categories)
          state.configDetails.categories = [];
        state.configDetails.categories.push(action.payload);
      }
    },
    updateCategory: (state, action) => {
      if (state.configDetails && state.configDetails.categories) {
        const index = state.configDetails.categories.findIndex(
          (c) => c.code === action.payload.code
        );
        if (index !== -1) {
          state.configDetails.categories[index] = {
            ...state.configDetails.categories[index],
            ...action.payload,
          };
        }
      }
    },
    deleteCategory: (state, action) => {
      if (state.configDetails && state.configDetails.categories) {
        state.configDetails.categories = state.configDetails.categories.filter(
          (c) => c.code !== action.payload
        );
      }
    },
    updateRiskBandsForCategory: (state, action) => {
      const { categoryCode, bands } = action.payload;
      if (state.configDetails && state.configDetails.categories) {
        const cat = state.configDetails.categories.find(
          (c) => c.code === categoryCode
        );
        if (cat) cat.riskBands = bands;
      }
    },

    // Question Editors
    addQuestion: (state, action) => {
      if (state.configDetails) {
        if (!state.configDetails.questions) state.configDetails.questions = [];
        state.configDetails.questions.push(action.payload);
      }
    },
    updateQuestion: (state, action) => {
      if (state.configDetails && state.configDetails.questions) {
        const idx = state.configDetails.questions.findIndex(
          (q) =>
            (q.id && q.id === action.payload.id) ||
            (q._tempId && q._tempId === action.payload._tempId)
        );
        if (idx !== -1) state.configDetails.questions[idx] = action.payload;
      }
    },
    deleteQuestion: (state, action) => {
      const id = action.payload;
      if (state.configDetails && state.configDetails.questions) {
        state.configDetails.questions = state.configDetails.questions.filter(
          (q) => q.id !== id && q._tempId !== id
        );
      }
    },

    // Risk Matrix Editors
    addRiskMatrixRow: (state, action) => {
      if (state.configDetails) {
        if (!state.configDetails.riskMatrix)
          state.configDetails.riskMatrix = [];
        state.configDetails.riskMatrix.push(action.payload);
      }
    },
    updateRiskMatrixRow: (state, action) => {
      if (state.configDetails && state.configDetails.riskMatrix) {
        const idx = state.configDetails.riskMatrix.findIndex(
          (r) =>
            (r.id && r.id === action.payload.id) ||
            (r._tempId && r._tempId === action.payload._tempId)
        );
        if (idx !== -1) state.configDetails.riskMatrix[idx] = action.payload;
      }
    },
    deleteRiskMatrixRow: (state, action) => {
      const id = action.payload;
      if (state.configDetails && state.configDetails.riskMatrix) {
        state.configDetails.riskMatrix = state.configDetails.riskMatrix.filter(
          (r) => r.id !== id && r._tempId !== id
        );
      }
    },

    // Threshold Editors
    addThreshold: (state, action) => {
      if (state.configDetails) {
        if (!state.configDetails.thresholds)
          state.configDetails.thresholds = [];
        state.configDetails.thresholds.push(action.payload);
      }
    },
    updateThreshold: (state, action) => {
      if (state.configDetails && state.configDetails.thresholds) {
        const idx = state.configDetails.thresholds.findIndex(
          (t) =>
            (t.id && t.id === action.payload.id) ||
            (t._tempId && t._tempId === action.payload._tempId)
        );
        if (idx !== -1) state.configDetails.thresholds[idx] = action.payload;
      }
    },
    deleteThreshold: (state, action) => {
      const id = action.payload;
      if (state.configDetails && state.configDetails.thresholds) {
        state.configDetails.thresholds = state.configDetails.thresholds.filter(
          (t) => t.id !== id && t._tempId !== id
        );
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfigurations.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfigurations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchConfigurations.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.error?.message || "An error occurred";
      })

      .addCase(createConfiguration.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(createConfiguration.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        if (action.payload?.id) {
          const index = state.items.findIndex((c) => c.id === action.payload.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          } else {
            state.items.push(action.payload);
          }
        }
      })
      .addCase(createConfiguration.rejected, (state) => {
        state.status = "failed";
        state.loading = false;
      })

      .addCase(forkConfiguration.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(forkConfiguration.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        if (action.payload?.id) {
          const index = state.items.findIndex((c) => c.id === action.payload.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          } else {
            state.items.push(action.payload);
          }
        }
      })
      .addCase(forkConfiguration.rejected, (state) => {
        state.status = "failed";
        state.loading = false;
      })

      .addCase(fetchConfiguration.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfiguration.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;

        // Update the item in the list
        const index = state.items.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        } else {
          state.items.push(action.payload);
        }

        state.configDetails = action.payload;
      })
      .addCase(fetchConfiguration.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.error?.message || "An error occurred";
      })

      .addCase(updateConfiguration.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.saveSuccess = false;
        state.error = null;
      })
      .addCase(updateConfiguration.fulfilled, (state) => {
        state.status = "succeeded";
        state.loading = false;
        state.saveSuccess = true;
      })
      .addCase(updateConfiguration.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.error?.message || "An error occurred";
      })

      .addCase(deleteConfiguration.pending, (state) => {
        state.status = "loading";
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteConfiguration.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.loading = false;
        state.items = state.items.filter((c) => c.id !== action.payload);
        if (state.configDetails && state.configDetails.id === action.payload) {
          state.configDetails = null;
        }
      })
      .addCase(deleteConfiguration.rejected, (state, action) => {
        state.status = "failed";
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.error?.message || "An error occurred";
      });
  },
});

export const {
  resetConfigurationState,
  resetSaveSuccess,
  setFullConfig,
  updateConfigurationField,
  addCategory,
  updateCategory,
  deleteCategory,
  updateRiskBandsForCategory,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  addRiskMatrixRow,
  updateRiskMatrixRow,
  deleteRiskMatrixRow,
  addThreshold,
  updateThreshold,
  deleteThreshold,
} = configurationSlice.actions;

export default configurationSlice.reducer;
