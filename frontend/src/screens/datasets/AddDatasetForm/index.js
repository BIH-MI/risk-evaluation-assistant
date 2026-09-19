// src/screens/datasets/AddDatasetForm/index.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RAInput from "components/input/RAInput";
import { MenuItem } from "@mui/material";

import { CSVDropzone } from "utils/CSVDropzone";
import { getErrorMessage } from "utils/errors";
import { PreviewTable } from "./PreviewTable";
import { useDatasetTableProfiling } from "./useDatasetTableProfiling";
import { addDataset } from "store/datasets/datasetsThunks";
import { fetchQidDiscoveryConfigurationsApi } from "api/qidDiscoveryConfigurations";
import { getQidSearchTypeLabel } from "qidDiscovery/configuration/searchTypeLabels";
import { getQidConfigurationValidationError } from "qidDiscovery/configuration/validateQidDiscoverySearchConfiguration";
import {
  toDatasetAttributePayload,
  toDatasetQidCombinationPayload,
} from "qidDiscovery/payload";
import {
  buildDirectIdentifierOverrideWarning,
  buildDirectIdentifierSubmissionMessage,
  isDefaultExcludedIdentifierColumn,
  validateDirectIdentifierExclusions,
} from "qidDiscovery/directIdentifierPolicy";

const DATASET_NAME_ALREADY_EXISTS = "DATASET_NAME_ALREADY_EXISTS";

let nextLocalTableId = 0;

const createLocalTableId = () => {
  nextLocalTableId += 1;
  return `add-dataset-table-${nextLocalTableId}`;
};

const getUniqueName = (existingNames, baseName, getFallbackName) => {
  const usedNames = new Set(existingNames);
  let candidate = baseName;
  let counter = 0;

  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = getFallbackName(counter);
  }

  return candidate;
};

const getColumnIdentity = (column = {}) => column.sourceField || column.field;

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
  const [qidDiscoveryConfigurations, setQidDiscoveryConfigurations] = useState(
    []
  );
  const [
    selectedQidDiscoveryConfigurationId,
    setSelectedQidDiscoveryConfigurationId,
  ] = useState("");
  const [qidConfigurationsLoading, setQidConfigurationsLoading] =
    useState(false);

  const directIdentifierValidation = useMemo(
    () => validateDirectIdentifierExclusions(tables),
    [tables]
  );
  const directIdentifierSubmissionMessage = useMemo(
    () => buildDirectIdentifierSubmissionMessage(t, directIdentifierValidation),
    [directIdentifierValidation, t]
  );
  const selectedQidDiscoveryConfiguration = useMemo(
    () =>
      qidDiscoveryConfigurations.find(
        (configuration) =>
          String(configuration.id) ===
          String(selectedQidDiscoveryConfigurationId)
      ) || null,
    [qidDiscoveryConfigurations, selectedQidDiscoveryConfigurationId]
  );

  /**
   * Surface an incomplete/invalid persisted QID Discovery Configuration as
   * soon as it's selected, rather than only discovering it once a CSV upload
   * reaches QID profiling.
   */
  const selectedQidDiscoveryConfigurationError = useMemo(() => {
    if (!selectedQidDiscoveryConfiguration) return "";
    return getQidConfigurationValidationError(
      selectedQidDiscoveryConfiguration
    );
  }, [selectedQidDiscoveryConfiguration]);

  const { profileTable, refreshTable, changeSubjectKey, disposeTableProfile } =
    useDatasetTableProfiling({
      tables,
      setTables,
      setErrors,
      t,
    });

  useEffect(() => {
    if (!token) return undefined;

    let mounted = true;
    const loadQidConfigurations = async () => {
      setQidConfigurationsLoading(true);
      try {
        const data = await fetchQidDiscoveryConfigurationsApi(token, {
          activeOnly: true,
        });
        if (!mounted) return;

        const activeConfigurations = Array.isArray(data) ? data : [];
        setQidDiscoveryConfigurations(activeConfigurations);
        setSelectedQidDiscoveryConfigurationId((current) => {
          if (
            current &&
            activeConfigurations.some(
              (configuration) => String(configuration.id) === String(current)
            )
          ) {
            return current;
          }

          const defaultConfiguration =
            activeConfigurations.find(
              (configuration) => configuration.defaultConfiguration
            ) || activeConfigurations[0];
          return defaultConfiguration ? String(defaultConfiguration.id) : "";
        });
      } catch (error) {
        if (mounted) {
          setErrors((current) => ({
            ...current,
            tables:
              error.message || t("datasets.alerts.loadQidConfigurationsFailed"),
          }));
        }
      } finally {
        if (mounted) setQidConfigurationsLoading(false);
      }
    };

    loadQidConfigurations();

    return () => {
      mounted = false;
    };
  }, [t, token]);

  const handleAddTable = useCallback(
    (file) => {
      if (!selectedQidDiscoveryConfiguration) {
        setErrors((e) => ({
          ...e,
          tables: t("datasets.alerts.qidConfigurationRequiredForProfiling"),
        }));
        return false;
      }

      if (selectedQidDiscoveryConfigurationError) {
        setErrors((e) => ({
          ...e,
          tables: t("datasets.alerts.qidConfigurationInvalid"),
        }));
        return false;
      }

      if (tables.some((table) => table.name === file.name)) {
        setErrors((e) => ({
          ...e,
          tables: t("datasets.alerts.duplicateCsv", { name: file.name }),
        }));
        return false;
      }

      const localTableId = createLocalTableId();

      setTables((prev) => {
        if (prev.some((table) => table.name === file.name)) {
          setErrors((e) => ({
            ...e,
            tables: t("datasets.alerts.duplicateCsv", { name: file.name }),
          }));
          return prev;
        }
        setErrors((e) => ({ ...e, tables: "" }));
        return [
          ...prev,
          {
            _localTableId: localTableId,
            name: file.name,
            isParsing: true,
            isManual: false,
          },
        ];
      });
      return localTableId;
    },
    [
      selectedQidDiscoveryConfiguration,
      selectedQidDiscoveryConfigurationError,
      tables,
      t,
    ]
  );

  const handleTableParse = useCallback(
    (file, tableId) => {
      profileTable(file, tableId, selectedQidDiscoveryConfiguration);
    },
    [profileTable, selectedQidDiscoveryConfiguration]
  );

  const handleSubjectKeyChange = useCallback(
    (tableId, sourceField) => {
      changeSubjectKey(tableId, sourceField || null);
    },
    [changeSubjectKey]
  );

  const handleAddManualTable = useCallback(() => {
    setTables((prev) => {
      const newName = getUniqueName(
        prev.map((table) => table.name),
        t("datasets.add.newTable"),
        (counter) => t("datasets.add.newTableCounter", { counter })
      );

      return [
        ...prev,
        {
          _localTableId: createLocalTableId(),
          name: newName,
          columnMeta: [],
          data: [],
          qidCombinations: [],
          qidSearchMode: "none",
          isParsing: false,
          isManual: true,
        },
      ];
    });
  }, [t]);

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

  const handleAddColumn = useCallback(
    (tableId) => {
      setTables((prev) =>
        prev.map((table) => {
          if (table._localTableId !== tableId) return table;

          const fieldName = getUniqueName(
            (table.columnMeta || []).map((column) => column.field),
            t("datasets.add.newAttribute"),
            (counter) => t("datasets.add.newAttributeCounter", { counter })
          );

          return {
            ...table,
            columnMeta: [
              ...(table.columnMeta || []),
              {
                field: fieldName,
                sourceField: null,
                hasObservedData: false,
                level: "STRING",
                excluded: false,
                statistics: null,
              },
            ],
          };
        })
      );
    },
    [t]
  );

  const handleDeleteColumn = useCallback(
    (tableId, columnKey) => {
      const table = tables.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;

      refreshTable(
        tableId,
        table.columnMeta.filter(
          (column) => getColumnIdentity(column) !== columnKey
        )
      );
    },
    [refreshTable, tables]
  );

  const handleRemoveTable = useCallback(
    (tableId) => {
      disposeTableProfile(tableId);
      setTables((prev) =>
        prev.filter((table) => table._localTableId !== tableId)
      );
      setErrors((e) => ({ ...e, tableName: "" }));
    },
    [disposeTableProfile]
  );

  /**
   * Renames the table shown in Add Dataset. The table name is persisted as
   * metadata only, but duplicate names would make later table/attribute review
   * ambiguous.
   */
  const handleTableNameChange = useCallback(
    (tableId, newName) => {
      const dup = tables.some(
        (table) => table._localTableId !== tableId && table.name === newName
      );
      if (dup) {
        setErrors((e) => ({
          ...e,
          tableName: t("datasets.alerts.duplicateTableName", { name: newName }),
        }));
        setTables((prev) => [...prev]);
        return false;
      }
      setErrors((e) => ({ ...e, tableName: "" }));
      setTables((prev) =>
        prev.map((table) =>
          table._localTableId === tableId ? { ...table, name: newName } : table
        )
      );
      return true;
    },
    [tables, t]
  );

  /**
   * Renames an attribute and refreshes the cached profile. Source columns stay
   * stable so Direct Identifier evidence and QID discovery can be recalculated
   * without parsing the CSV again.
   */
  const handleColumnNameChange = useCallback(
    (tableId, columnKey, newField) => {
      const table = tables.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;

      refreshTable(
        tableId,
        table.columnMeta.map((column) =>
          getColumnIdentity(column) === columnKey
            ? {
                ...column,
                field: newField,
              }
            : column
        )
      );
    },
    [refreshTable, tables]
  );

  const handleDataTypeChange = useCallback((tableId, columnKey, newType) => {
    setTables((prev) =>
      prev.map((table) =>
        table._localTableId === tableId
          ? {
              ...table,
              columnMeta: table.columnMeta.map((column) =>
                getColumnIdentity(column) === columnKey
                  ? { ...column, level: newType }
                  : column
              ),
            }
          : table
      )
    );
  }, []);

  /**
   * Applies the user's QID-candidacy decision. Unchecking an automatically
   * excluded identifier records an override before refreshing discovery so the
   * column immediately becomes a QID candidate and is not re-excluded.
   */
  const handleExcludedChange = useCallback(
    (tableId, columnKey, excluded) => {
      const table = tables.find(
        (currentTable) => currentTable._localTableId === tableId
      );
      if (!table) return;

      const changedColumn = table.columnMeta.find(
        (column) => getColumnIdentity(column) === columnKey
      );
      const overrideWarning = buildDirectIdentifierOverrideWarning(
        t,
        changedColumn,
        excluded
      );
      if (overrideWarning) {
        setWarnings((current) => ({
          ...current,
          directIdentifier: overrideWarning,
        }));
      } else if (excluded) {
        setWarnings((current) => ({
          ...current,
          directIdentifier: "",
        }));
      }

      refreshTable(
        tableId,
        table.columnMeta.map((column) =>
          getColumnIdentity(column) === columnKey
            ? {
                ...column,
                excluded,
                directIdentifierExclusionOverridden:
                  !excluded && isDefaultExcludedIdentifierColumn(column),
              }
            : column
        )
      );
    },
    [refreshTable, tables, t]
  );

  /**
   * Persists aggregate profiling output and the reviewed exclusion decisions.
   * Raw rows, encoded columns, and combination caches remain browser-local.
   */
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!name.trim()) return;
      if (!selectedQidDiscoveryConfiguration) {
        setErrors((e) => ({
          ...e,
          tables: t("datasets.alerts.qidConfigurationRequiredForSubmit"),
        }));
        return;
      }
      if (!tables.length) {
        setErrors((e) => ({ ...e, tables: t("datasets.alerts.noTables") }));
        return;
      }
      if (tables.some((table) => table.isParsing || table.isProfiling)) {
        setErrors((e) => ({
          ...e,
          tables: t(
            "datasets.alerts.parsingInProgress",
            "Please wait until all CSV files finish parsing."
          ),
        }));
        return;
      }
      if (!directIdentifierValidation.canSubmit) {
        setErrors((e) => ({
          ...e,
          tables: directIdentifierSubmissionMessage,
        }));
        return;
      }

      const payloadTables = tables.map(
        ({ name: fileName, columnMeta = [], qidCombinations = [] }) => ({
          name: fileName.replace(/\.csv$/i, ""),
          attributes: columnMeta.map(toDatasetAttributePayload),
          qidCombinations: qidCombinations.map(toDatasetQidCombinationPayload),
        })
      );

      dispatch(
        addDataset({
          newDataset: {
            name: name.trim(),
            description: description.trim(),
            qidDiscoveryConfigurationId: selectedQidDiscoveryConfiguration.id,
            qidDiscoveryConfigurationVersionId:
              selectedQidDiscoveryConfiguration.versionId,
            sharedUsernames: sharedUsers.map((u) => u.username),
            tables: payloadTables,
          },
          token,
        })
      )
        .unwrap()
        .then(() => {
          navigate("/datasets");
        })
        .catch((err) => {
          if (err?.code === DATASET_NAME_ALREADY_EXISTS) {
            setErrors((e) => ({
              ...e,
              name: t("datasets.alerts.duplicateDatasetName"),
              tables: "",
            }));
            return;
          }

          setErrors((e) => ({
            ...e,
            tables: getErrorMessage(err, t("datasets.alerts.submissionFailed")),
          }));
        });
    },
    [
      name,
      description,
      sharedUsers,
      selectedQidDiscoveryConfiguration,
      tables,
      directIdentifierValidation,
      directIdentifierSubmissionMessage,
      dispatch,
      token,
      navigate,
      t,
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
          onChange={(_e, newUsers) => setSharedUsers(newUsers || [])}
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
                  {getQidSearchTypeLabel(t, configuration.search?.searchType)}
                </RATypography>
              </RABox>
            </MenuItem>
          ))}
        </RAInput>

        <CSVDropzone
          onParse={handleTableParse}
          onAddTable={handleAddTable}
          onManualAdd={handleAddManualTable}
          setError={(msg) => setErrors((e) => ({ ...e, tables: msg }))}
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
          <>
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

            <RATypography variant="body2" color="secondary" textAlign="center">
              {t("datasets.add.directIdentifierInstruction")}
            </RATypography>
          </>
        )}

        {tables.map((table) => (
          <PreviewTable
            key={table._localTableId}
            file={table}
            onRemove={handleRemoveTable}
            onTableNameChange={handleTableNameChange}
            onColumnNameChange={handleColumnNameChange}
            onDataTypeChange={handleDataTypeChange}
            onExcludedChange={handleExcludedChange}
            onAddColumn={handleAddColumn}
            onDeleteColumn={handleDeleteColumn}
            onSubjectKeyChange={handleSubjectKeyChange}
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
            onClose: () => setErrors((e) => ({ ...e, tables: "" })),
          },
          {
            id: "tableName",
            color: "error",
            message: errors.tableName,
            onClose: () => setErrors((e) => ({ ...e, tableName: "" })),
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
