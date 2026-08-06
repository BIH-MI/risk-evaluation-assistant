import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchConfigurationsApi,
  createConfigurationApi,
  forkConfigurationApi,
  fetchConfigurationApi,
  updateConfigurationApi,
  archiveConfigurationApi,
  setDefaultConfigurationApi,
  deleteConfigurationApi,
} from "../../api/configurations";

const normalizeQuestions = (questions) => {
  if (!questions) return [];
  return questions.map((q) => ({
    ...q,
    textTranslations: q.textTranslations || {},
    options: (q.options || []).map((opt) => ({
      ...opt,
      textTranslations: opt.textTranslations || {},
      isHighRiskTrigger: opt.isHighRiskTrigger ?? opt.highRiskTrigger ?? false,
    })),
  }));
};

const normalizeConfiguration = (configData, fallbacks = {}) => ({
  id: configData?.id,
  versionId: configData?.versionId,
  version: configData?.version || configData?.currentVersion || 0,
  currentVersion: configData?.currentVersion || configData?.version || 0,
  name: configData?.name || "",
  description: configData?.description || "",
  defaultLanguage: configData?.defaultLanguage || "en",
  isDefault: configData?.default ?? configData?.isDefault ?? false,
  isActive: configData?.active ?? configData?.isActive ?? true,
  creatorUsername: configData?.creatorUsername || "—",
  sharedUsernames: configData?.sharedUsernames || [],
  assessmentCount: configData?.assessmentCount || 0,
  creationDate: configData?.creationDate,
  lastModifiedDate: configData?.lastModifiedDate,
  categories:
    configData?.riskCategories ??
    configData?.categories ??
    fallbacks?.categories ??
    [],
  questions: normalizeQuestions(configData?.questions ?? fallbacks?.questions),
  riskMatrix:
    configData?.riskMatrices ??
    configData?.riskMatrix ??
    fallbacks?.matrix ??
    [],
  thresholds:
    configData?.reidThresholds ??
    configData?.thresholds ??
    fallbacks?.thresholds ??
    [],
});

export const fetchConfigurations = createAsyncThunk(
  "configuration/fetchAll",
  async (token, { rejectWithValue }) => {
    try {
      const data = await fetchConfigurationsApi(token);

      return (Array.isArray(data) ? data : []).map((configData) =>
        normalizeConfiguration(configData)
      );
    } catch (err) {
      return rejectWithValue(err.message || "Failed to fetch configurations");
    }
  }
);

export const createConfiguration = createAsyncThunk(
  "configuration/create",
  async ({ configData, token }, { rejectWithValue }) => {
    try {
      const createdConfiguration = await createConfigurationApi(
        configData,
        token
      );
      return normalizeConfiguration(createdConfiguration);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to process configuration");
    }
  }
);

export const forkConfiguration = createAsyncThunk(
  "configuration/fork",
  async ({ id, newConfigName, token }, { rejectWithValue }) => {
    try {
      const forkedConfiguration = await forkConfigurationApi(
        id,
        newConfigName,
        token
      );
      return normalizeConfiguration(forkedConfiguration);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to process configuration");
    }
  }
);

export const fetchConfiguration = createAsyncThunk(
  "configuration/fetchFull",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      const data = await fetchConfigurationApi(id, token);

      let configData = data;
      if (Array.isArray(data) && data.length > 0) configData = data[0];
      else if (data?.config) configData = data.config;
      else if (data?.data) configData = data.data;

      // Package everything into a single configuration object
      return normalizeConfiguration(configData, data);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch configuration");
    }
  }
);

export const updateConfiguration = createAsyncThunk(
  "configuration/update",
  async ({ id, token }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const configDetails = state.configurations.configDetails;

      const cleanTempIds = (items) =>
        items?.map(({ _tempId, ...rest }) => rest) || [];

      const cleanCategories = (categories) =>
        categories?.map(({ _tempId, riskBands, ...rest }) => ({
          ...rest,
          riskBands: riskBands ? cleanTempIds(riskBands) : [],
        })) || [];

      const cleanQuestions = (questions) =>
        questions?.map(({ _tempId, options, textTranslations, ...rest }) => ({
          ...rest,
          textTranslations: textTranslations || {},
          options: options
            ? options.map(
                ({
                  _tempId,
                  code,
                  textTranslations: optTrans,
                  ...optRest
                }) => ({
                  ...optRest,
                  textTranslations: optTrans || {},
                  riskLevel: Number(optRest.score ?? optRest.riskLevel ?? 0),
                  isHighRiskTrigger: Boolean(optRest.isHighRiskTrigger),
                  highRiskTrigger: Boolean(optRest.isHighRiskTrigger),
                })
              )
            : [],
        })) || [];

      const payload = {
        name: configDetails.name,
        description: configDetails.description,
        defaultLanguage: configDetails.defaultLanguage,
        isDefault: configDetails.isDefault,
        isActive: configDetails.isActive,
        sharedUsernames: configDetails.sharedUsernames || [],
        categories: cleanCategories(configDetails.categories),
        questions: cleanQuestions(configDetails.questions),
        riskMatrix: cleanTempIds(configDetails.riskMatrix),
        thresholds: cleanTempIds(configDetails.thresholds),
      };

      const updatedConfiguration = await updateConfigurationApi(
        id,
        payload,
        token
      );
      return normalizeConfiguration(updatedConfiguration);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to process configuration");
    }
  }
);

export const deleteConfiguration = createAsyncThunk(
  "configuration/delete",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      await deleteConfigurationApi(id, token);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Failed to process configuration");
    }
  }
);

export const archiveConfiguration = createAsyncThunk(
  "configuration/archive",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      const archivedConfiguration = await archiveConfigurationApi(id, token);
      return normalizeConfiguration(archivedConfiguration);
    } catch (err) {
      return rejectWithValue(err.message || "Failed to archive configuration");
    }
  }
);

export const setDefaultConfiguration = createAsyncThunk(
  "configuration/setDefault",
  async ({ id, token }, { rejectWithValue }) => {
    try {
      const defaultConfiguration = await setDefaultConfigurationApi(id, token);
      return normalizeConfiguration(defaultConfiguration);
    } catch (err) {
      return rejectWithValue(
        err.message || "Failed to set default configuration"
      );
    }
  }
);
