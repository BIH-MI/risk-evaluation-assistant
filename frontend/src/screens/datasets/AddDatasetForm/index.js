import { hasCompleteProfiling } from "features/qidDiscovery/profiling/profilingOutcome";
import { useDatasetDiscovery } from "./hooks/useDatasetDiscovery";
import { useDatasetSubmission } from "./hooks/useDatasetSubmission";
import { DiscoveryConfigurationFields } from "features/qidDiscovery/components/DiscoveryConfigurationFields";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import { CSVDropzone } from "utils/CSVDropzone";
import {
  buildDirectIdentifierSubmissionMessage,
  validateDirectIdentifierExclusions,
} from "features/qidDiscovery/validation/directIdentifierPolicy";
import { DatasetPreviewTable } from "./components/DatasetPreviewTable";
import { useQidDiscoveryConfigurationSelection } from "features/qidDiscovery/hooks/useQidDiscoveryConfigurationSelection";
import { useAiModelSelection } from "features/qidDiscovery/hooks/useAiModelSelection";
import { getTableAiState } from "features/qidDiscovery/ai/aiSuggestionTableState";
import {
  markQidStage,
  startQidPipelineTiming,
} from "features/qidDiscovery/diagnostics/qidPipelineTimings";


export default function AddDatasetForm() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const token = user?.access_token;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sharedUsers, setSharedUsers] = useState([]);
  const [tables, setTables] = useState([]);
  const [errors, setErrors] = useState({
    name: "",
    tables: "",
    tableName: "",
  });
  const [warnings, setWarnings] = useState({ directIdentifier: "" });

  const {
    configurations: qidDiscoveryConfigurations,
    selectedConfiguration: selectedQidDiscoveryConfiguration,
    selectedConfigurationId: selectedQidDiscoveryConfigurationId,
    setSelectedConfigurationId: setSelectedQidDiscoveryConfigurationId,
    selectedConfigurationError: selectedQidDiscoveryConfigurationError,
    loading: qidConfigurationsLoading,
    loadFailed: qidConfigurationsLoadFailed,
    loadError: qidConfigurationsLoadError,
  } = useQidDiscoveryConfigurationSelection(token);

  const {
    enabled: aiScreeningEnabled,
    models: aiModels,
    defaultModelId: defaultAiModelId,
    allowSelection: allowAiModelSelection,
    selectedModelId: selectedAiModelId,
    setSelectedModelId: setSelectedAiModelId,
    unavailableReason: aiModelUnavailableReason,
    loading: aiModelsLoading,
  } = useAiModelSelection(selectedQidDiscoveryConfiguration, {
    locked: tables.length > 0,
  });

  const directIdentifierValidation = useMemo(
    () => validateDirectIdentifierExclusions(tables),
    [tables]
  );
  const directIdentifierSubmissionMessage = useMemo(
    () => buildDirectIdentifierSubmissionMessage(t, directIdentifierValidation),
    [directIdentifierValidation, t]
  );

  const {
    aiStateByTable,
    classifyFields,
    preloadModel,
    prepareUploadedCsv,
    addUploadedTablePlaceholder,
    addManualTable,
    addAttribute,
    deleteAttribute,
    removeTable,
    renameTable,
    renameAttribute,
    changeAttributeDataType,
    handleExcludedChange,
    handleConfirmScreening,
  } = useDatasetDiscovery({
    tables,
    setTables,
    setErrors,
    setWarnings,
    selectedAiModelId,
    aiScreeningEnabled,
    t,
  });

  useEffect(() => {
    if (!qidConfigurationsLoadFailed) return;

    setErrors((current) => ({
      ...current,
      tables:
        qidConfigurationsLoadError ||
        t("datasets.alerts.loadQidConfigurationsFailed"),
    }));
  }, [qidConfigurationsLoadError, qidConfigurationsLoadFailed, t]);

  const clearNameError = useCallback(() => {
    setErrors((current) => (current.name ? { ...current, name: "" } : current));
  }, []);

  const handleNameCommit = useCallback(
    (value) => {
      setName(value);
      clearNameError();
    },
    [clearNameError]
  );

  const handleAddTable = useCallback(
    (file) => {
      if (!selectedQidDiscoveryConfiguration) {
        setErrors((current) => ({
          ...current,
          tables: t("datasets.alerts.qidConfigurationRequiredForProfiling"),
        }));
        return false;
      }

      if (selectedQidDiscoveryConfigurationError) {
        setErrors((current) => ({
          ...current,
          tables: t("datasets.alerts.qidConfigurationInvalid"),
        }));
        return false;
      }

      return addUploadedTablePlaceholder(file);
    },
    [
      addUploadedTablePlaceholder,
      selectedQidDiscoveryConfiguration,
      selectedQidDiscoveryConfigurationError,
      setErrors,
      t,
    ]
  );

  /**
   * Starts the two independent preparation tasks for an uploaded CSV: the QID
   * worker parses and encodes the file, while the AI worker loads the model
   * and classifies the header names as soon as they are parsed. Only header
   * names are passed to the AI worker.
   */
  const handleTableParse = useCallback(
    (file, tableId) => {
      startQidPipelineTiming(tableId);
      preloadModel(tableId);
      prepareUploadedCsv(file, tableId, selectedQidDiscoveryConfiguration, {
        onFields: (fields) => {
          markQidStage(tableId, "csvFieldsAvailableAtMs");
          classifyFields(tableId, fields);
        },
      });
    },
    [
      classifyFields,
      preloadModel,
      prepareUploadedCsv,
      selectedQidDiscoveryConfiguration,
    ]
  );

  const handleSubmit = useDatasetSubmission({
    name,
    description,
    sharedUsers,
    tables,
    selectedQidDiscoveryConfiguration,
    selectedAiModelId,
    aiStateByTable,
    aiScreeningEnabled,
    directIdentifierValidation,
    directIdentifierSubmissionMessage,
    token,
    t,
    setErrors,
  });

  const disableSubmit =
    !name.trim() ||
    !selectedQidDiscoveryConfiguration ||
    !tables.length ||
    tables.some((table) => table.isParsing || table.isProfiling || !hasCompleteProfiling(table)) ||
    !directIdentifierValidation.canSubmit;
  const hasReadyTables = tables.some(
    (table) => !table.isParsing && Array.isArray(table.columnMeta)
  );

  return (
    <RABox py={8}>
      <RABox
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          // Form fields keep a readable width; preview tables use the full
          // available width.
          "& > :not([data-preview-table]):not(button)": {
            width: "100%",
            maxWidth: 1000,
            alignSelf: "center",
          },
        }}
      >
        <RATypography variant="h5" textAlign="center">
          {t("datasets.add.title")}
        </RATypography>

        <OnBlurRAInput
          label={t("datasets.form.datasetNameLabel")}
          value={name}
          onCommit={handleNameCommit}
          onInput={clearNameError}
          error={Boolean(errors.name)}
          fullWidth
          required
        />

        <OnBlurRAInput
          label={t("datasets.form.datasetDescriptionLabel")}
          value={description}
          onCommit={setDescription}
          fullWidth
          multiline
          rows={3}
        />

        <RAUserAutocomplete
          multiple
          label={t("datasets.form.sharedUsers")}
          value={sharedUsers}
          onChange={(_event, newUsers) => setSharedUsers(newUsers || [])}
          placeholder={t("datasets.form.searchUsersPlaceholder")}
        />

        <DiscoveryConfigurationFields
          t={t}
          selectedQidDiscoveryConfigurationId={
            selectedQidDiscoveryConfigurationId
          }
          setSelectedQidDiscoveryConfigurationId={
            setSelectedQidDiscoveryConfigurationId
          }
          qidConfigurationsLoading={qidConfigurationsLoading}
          tables={tables}
          selectedQidDiscoveryConfigurationError={
            selectedQidDiscoveryConfigurationError
          }
          qidDiscoveryConfigurations={qidDiscoveryConfigurations}
          aiScreeningEnabled={aiScreeningEnabled}
          selectedAiModelId={selectedAiModelId}
          setSelectedAiModelId={setSelectedAiModelId}
          aiModelsLoading={aiModelsLoading}
          allowAiModelSelection={allowAiModelSelection}
          aiModelUnavailableReason={aiModelUnavailableReason}
          aiModels={aiModels}
          defaultAiModelId={defaultAiModelId}
        />

        <CSVDropzone
          onParse={handleTableParse}
          onAddTable={handleAddTable}
          onManualAdd={addManualTable}
          setError={(message) =>
            setErrors((current) => ({ ...current, tables: message }))
          }
          // Wait for the AI model list so uploads use the intended model.
          disabled={
            Boolean(selectedQidDiscoveryConfigurationError) || aiModelsLoading
          }
        />

        {directIdentifierSubmissionMessage && (
          <RABox
            sx={{
              p: 1.5,
              borderLeft: "4px solid",
              borderColor: "warning.main",
              bgcolor: "rgba(251, 140, 0, 0.08)",
              borderRadius: 1,
            }}
          >
            <RATypography
              variant="body2"
              sx={{ whiteSpace: "pre-line", color: "text.primary" }}
            >
              {directIdentifierSubmissionMessage}
            </RATypography>
          </RABox>
        )}

        {hasReadyTables && (
          <RABox
            display="flex"
            justifyContent="center"
            alignItems="center"
            mt={4}
            gap={2}
          >
            <RATypography variant="h6" textAlign="center">
              {t("datasets.add.dataTablesPreview")}
            </RATypography>
          </RABox>
        )}

        {tables.map((table) => (
          <DatasetPreviewTable
            key={table._localTableId}
            file={table}
            onRemove={removeTable}
            onTableNameChange={renameTable}
            onColumnNameChange={renameAttribute}
            onDataTypeChange={changeAttributeDataType}
            onExcludedChange={handleExcludedChange}
            onConfirmScreening={handleConfirmScreening}
            onAddColumn={addAttribute}
            onDeleteColumn={deleteAttribute}
            aiState={getTableAiState(aiStateByTable, table._localTableId)}
            aiEnabled={aiScreeningEnabled}
          />
        ))}

        <RAButton
          type="submit"
          variant="contained"
          size="small"
          disabled={disableSubmit}
          sx={{ alignSelf: "center", mt: 2 }}
        >
          {t("datasets.add.createButton")}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "name",
            color: "error",
            message: errors.name,
            onClose: clearNameError,
          },
          {
            id: "tables",
            color: "error",
            message: errors.tables,
            onClose: () => setErrors((current) => ({ ...current, tables: "" })),
          },
          {
            id: "tableName",
            color: "error",
            message: errors.tableName,
            onClose: () =>
              setErrors((current) => ({ ...current, tableName: "" })),
          },
          {
            id: "directIdentifier",
            color: "warning",
            message: warnings.directIdentifier,
            onClose: () =>
              setWarnings((current) => ({ ...current, directIdentifier: "" })),
          },
        ]}
      />
    </RABox>
  );
}
