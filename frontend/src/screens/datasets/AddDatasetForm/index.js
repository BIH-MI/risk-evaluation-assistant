// src/screens/datasets/AddDatasetForm/index.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { MenuItem } from "@mui/material";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RAInput from "components/input/RAInput";
import { CSVDropzone } from "utils/CSVDropzone";
import { getErrorMessage } from "utils/errors";
import { addDataset } from "store/datasets/datasetsThunks";
import {
  buildDirectIdentifierSubmissionMessage,
  validateDirectIdentifierExclusions,
} from "qidDiscovery";
import { PreviewTable } from "./PreviewTable";
import { buildAddDatasetPayload } from "./buildAddDatasetPayload";
import { useDatasetSchemaEditor } from "./useDatasetSchemaEditor";
import { useDatasetTableProfiling } from "./useDatasetTableProfiling";
import { useQidDiscoveryConfigurationSelection } from "./useQidDiscoveryConfigurationSelection";

const DATASET_NAME_ALREADY_EXISTS = "DATASET_NAME_ALREADY_EXISTS";

export default function AddDatasetForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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

  const directIdentifierValidation = useMemo(
    () => validateDirectIdentifierExclusions(tables),
    [tables]
  );
  const directIdentifierSubmissionMessage = useMemo(
    () => buildDirectIdentifierSubmissionMessage(t, directIdentifierValidation),
    [directIdentifierValidation, t]
  );

  const { profileTable, refreshTable, disposeTableProfile } =
    useDatasetTableProfiling({
      tables,
      setTables,
      setErrors,
      t,
    });

  const {
    addUploadedTablePlaceholder,
    addManualTable,
    addAttribute,
    deleteAttribute,
    removeTable,
    renameTable,
    renameAttribute,
    changeAttributeDataType,
    changeAttributeExclusion,
  } = useDatasetSchemaEditor({
    tables,
    setTables,
    setErrors,
    setWarnings,
    refreshTable,
    disposeTableProfile,
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
    setErrors((current) =>
      current.name ? { ...current, name: "" } : current
    );
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

  const handleTableParse = useCallback(
    (file, tableId) => {
      profileTable(file, tableId, selectedQidDiscoveryConfiguration);
    },
    [profileTable, selectedQidDiscoveryConfiguration]
  );

  /**
   * Persists aggregate profiling output and reviewed exclusion decisions. Raw
   * rows, encoded columns, and subset partitions remain browser-local.
   */
  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!name.trim()) return;
      if (!selectedQidDiscoveryConfiguration) {
        setErrors((current) => ({
          ...current,
          tables: t("datasets.alerts.qidConfigurationRequiredForSubmit"),
        }));
        return;
      }
      if (!tables.length) {
        setErrors((current) => ({
          ...current,
          tables: t("datasets.alerts.noTables"),
        }));
        return;
      }
      if (tables.some((table) => table.isParsing || table.isProfiling)) {
        setErrors((current) => ({
          ...current,
          tables: t(
            "datasets.alerts.parsingInProgress",
            "Please wait until all CSV files finish parsing."
          ),
        }));
        return;
      }
      if (!directIdentifierValidation.canSubmit) {
        setErrors((current) => ({
          ...current,
          tables: directIdentifierSubmissionMessage,
        }));
        return;
      }

      dispatch(
        addDataset({
          newDataset: buildAddDatasetPayload({
            name,
            description,
            sharedUsers,
            selectedQidDiscoveryConfiguration,
            tables,
          }),
          token,
        })
      )
        .unwrap()
        .then(() => {
          navigate("/datasets");
        })
        .catch((error) => {
          if (error?.code === DATASET_NAME_ALREADY_EXISTS) {
            setErrors((current) => ({
              ...current,
              name: t("datasets.alerts.duplicateDatasetName"),
              tables: "",
            }));
            return;
          }

          setErrors((current) => ({
            ...current,
            tables: getErrorMessage(
              error,
              t("datasets.alerts.submissionFailed")
            ),
          }));
        });
    },
    [
      description,
      directIdentifierSubmissionMessage,
      directIdentifierValidation,
      dispatch,
      name,
      navigate,
      selectedQidDiscoveryConfiguration,
      sharedUsers,
      tables,
      t,
      token,
    ]
  );

  const disableSubmit =
    !name.trim() ||
    !selectedQidDiscoveryConfiguration ||
    !tables.length ||
    tables.some((table) => table.isParsing || table.isProfiling) ||
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
          maxWidth: 1000,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
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

        <RAInput
          select
          label={t("datasets.form.qidDiscoveryConfigurationLabel")}
          value={selectedQidDiscoveryConfigurationId}
          onChange={(event) =>
            setSelectedQidDiscoveryConfigurationId(event.target.value)
          }
          fullWidth
          disabled={qidConfigurationsLoading || tables.length > 0}
          error={Boolean(selectedQidDiscoveryConfigurationError)}
          helperText={
            selectedQidDiscoveryConfigurationError
              ? t("datasets.alerts.qidConfigurationInvalid")
              : ""
          }
        >
          {qidDiscoveryConfigurations.map((configuration) => (
            <MenuItem key={configuration.id} value={String(configuration.id)}>
              <RABox display="flex" flexDirection="column">
                <RATypography variant="button">
                  {configuration.name}
                </RATypography>
                <RATypography variant="caption" color="text">
                  {t(
                    "datasets.form.qidDiscoveryConfigurationSummary",
                    "Max subset size {{maxSubsetSize}}, limit {{maxEvaluatedSubsets}} subsets",
                    {
                      maxSubsetSize:
                        configuration.profiling?.maxSubsetSize ?? "-",
                      maxEvaluatedSubsets:
                        configuration.profiling?.maxEvaluatedSubsets ?? "-",
                    }
                  )}
                </RATypography>
              </RABox>
            </MenuItem>
          ))}
        </RAInput>

        <CSVDropzone
          onParse={handleTableParse}
          onAddTable={handleAddTable}
          onManualAdd={addManualTable}
          setError={(message) =>
            setErrors((current) => ({ ...current, tables: message }))
          }
          disabled={Boolean(selectedQidDiscoveryConfigurationError)}
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
          <PreviewTable
            key={table._localTableId}
            file={table}
            onRemove={removeTable}
            onTableNameChange={renameTable}
            onColumnNameChange={renameAttribute}
            onDataTypeChange={changeAttributeDataType}
            onExcludedChange={changeAttributeExclusion}
            onAddColumn={addAttribute}
            onDeleteColumn={deleteAttribute}
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
            onClose: () =>
              setErrors((current) => ({ ...current, tables: "" })),
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
