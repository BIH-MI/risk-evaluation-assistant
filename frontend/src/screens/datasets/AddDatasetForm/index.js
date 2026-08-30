// src/screens/datasets/AddDatasetForm/index.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RAAlert from "components/feedback/RAAlert";

import { CSVDropzone } from "utils/CSVDropzone";
import { PreviewTable } from "./PreviewTable";
import { addDataset } from "store/datasets/datasetsThunks";
import {
  disposeUploadedTableProfile,
  profileUploadedTable,
  refreshUploadedTableProfile,
} from "qidDiscovery";
import {
  toDatasetAttributePayload,
  toDatasetQidCombinationPayload,
} from "qidDiscovery/payload";

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
  const [errors, setErrors] = useState({ tables: "", tableName: "" });
  const tablesRef = useRef(tables);
  const profileRefreshCounterRef = useRef(0);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    return () => {
      tablesRef.current.forEach((table) => {
        disposeUploadedTableProfile(table._qidProfilingSession);
      });
    };
  }, []);

  // --- CSV handlers ---

  const handleAddTable = useCallback(
    (file) => {
      if (tables.some((table) => table.name === file.name)) {
        setErrors((e) => ({
          ...e,
          tables: t("datasets.alerts.duplicateCsv", { name: file.name }),
        }));
        return false;
      }

      setTables((prev) => {
        if (prev.some((t) => t.name === file.name)) {
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
            _localTableId: createLocalTableId(),
            name: file.name,
            isParsing: true,
            isManual: false,
          },
        ];
      });
      return true;
    },
    [tables, t]
  );

  const handleTableParse = useCallback(
    async (file) => {
      try {
        const { profilingSession, ...profiledTable } =
          await profileUploadedTable(file);

        setTables((prev) =>
          prev.map((table) =>
            table.name === file.name && table.isParsing
              ? {
                  ...profiledTable,
                  _localTableId: table._localTableId,
                  _qidProfilingSession: profilingSession,
                  isParsing: false,
                  isProfiling: false,
                  isManual: false,
                }
              : table
          )
        );
      } catch (err) {
        setErrors((e) => ({
          ...e,
          tables:
            err.message ||
            t("datasets.alerts.profilingFailed", "CSV profiling failed."),
        }));
        setTables((prev) =>
          prev.filter((table) => !(table.name === file.name && table.isParsing))
        );
      }
    },
    [t]
  );

  const refreshTableAfterSchemaChange = useCallback(
    (table, nextColumnMeta) => {
      if (!table._qidProfilingSession) {
        setTables((prev) =>
          prev.map((currentTable) =>
            currentTable._localTableId === table._localTableId
              ? {
                  ...currentTable,
                  columnMeta: nextColumnMeta,
                  qidCombinations: [],
                  qidSearchMode: "none",
                }
              : currentTable
          )
        );
        return;
      }

      const requestId = profileRefreshCounterRef.current + 1;
      profileRefreshCounterRef.current = requestId;

      setTables((prev) =>
        prev.map((currentTable) =>
          currentTable._localTableId === table._localTableId
            ? {
                ...currentTable,
                columnMeta: nextColumnMeta,
                isProfiling: true,
                _qidRefreshRequestId: requestId,
              }
            : currentTable
        )
      );

      refreshUploadedTableProfile(table._qidProfilingSession, nextColumnMeta)
        .then(({ columnMeta, qidCombinations, qidSearchMode }) => {
          setTables((prev) =>
            prev.map((currentTable) =>
              currentTable._localTableId === table._localTableId &&
              currentTable._qidRefreshRequestId === requestId
                ? {
                    ...currentTable,
                    columnMeta,
                    qidCombinations,
                    qidSearchMode,
                    isProfiling: false,
                  }
                : currentTable
            )
          );
        })
        .catch((err) => {
          setErrors((e) => ({
            ...e,
            tables:
              err.message ||
              t("datasets.alerts.profilingFailed", "CSV profiling failed."),
          }));
          setTables((prev) =>
            prev.map((currentTable) =>
              currentTable._localTableId === table._localTableId
                ? {
                    ...currentTable,
                    isProfiling: false,
                  }
                : currentTable
            )
          );
        });
    },
    [t]
  );

  // --- Manual Table Handlers ---

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

  const handleAddColumn = useCallback(
    (tableName) => {
      setTables((prev) =>
        prev.map((table) => {
          if (table.name !== tableName) return table;

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
    (tableName, fieldName) => {
      const table = tables.find(
        (currentTable) => currentTable.name === tableName
      );
      if (!table) return;

      refreshTableAfterSchemaChange(
        table,
        table.columnMeta.filter((column) => column.field !== fieldName)
      );
    },
    [refreshTableAfterSchemaChange, tables]
  );

  // --- Common Handlers ---

  const handleRemoveTable = useCallback(
    (tableName) => {
      const table = tables.find(
        (currentTable) => currentTable.name === tableName
      );
      disposeUploadedTableProfile(table?._qidProfilingSession);
      setTables((prev) => prev.filter((t) => t.name !== tableName));
      setErrors((e) => ({ ...e, tableName: "" }));
    },
    [tables]
  );

  const handleTableNameChange = useCallback(
    (oldName, newName) => {
      const dup = tables.some((t) => t.name === newName && t.name !== oldName);
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
        prev.map((t) => (t.name === oldName ? { ...t, name: newName } : t))
      );
      return true;
    },
    [tables, t]
  );

  const handleColumnNameChange = useCallback(
    (tableName, oldField, newField) => {
      const table = tables.find(
        (currentTable) => currentTable.name === tableName
      );
      if (!table) return;

      refreshTableAfterSchemaChange(
        table,
        table.columnMeta.map((column) =>
          column.field === oldField
            ? {
                ...column,
                field: newField,
              }
            : column
        )
      );
    },
    [refreshTableAfterSchemaChange, tables]
  );

  const handleDataTypeChange = useCallback((tableName, field, newType) => {
    setTables((prev) =>
      prev.map((t) =>
        t.name === tableName
          ? {
              ...t,
              columnMeta: t.columnMeta.map((c) =>
                c.field === field ? { ...c, level: newType } : c
              ),
            }
          : t
      )
    );
  }, []);

  const handleExcludedChange = useCallback(
    (tableName, field, excluded) => {
      const table = tables.find(
        (currentTable) => currentTable.name === tableName
      );
      if (!table) return;

      refreshTableAfterSchemaChange(
        table,
        table.columnMeta.map((column) =>
          column.field === field
            ? {
                ...column,
                excluded,
              }
            : column
        )
      );
    },
    [refreshTableAfterSchemaChange, tables]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!name.trim()) return;
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

      // REVIEW(PRIVACY): Participant-level rows are transient browser-local input.
      // Raw rows and observed values must never be included in Redux, persistence,
      // API payloads, logs or external requests. Only aggregate statistics are
      // persisted when the Dataset is created.
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
          setErrors((e) => ({
            ...e,
            tables: err.message || t("datasets.alerts.submissionFailed"),
          }));
        });
    },
    [name, description, sharedUsers, tables, dispatch, token, navigate, t]
  );

  const disableSubmit =
    !name.trim() ||
    !tables.length ||
    tables.some((table) => table.isParsing || table.isProfiling);

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
          onCommit={setName}
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

        <CSVDropzone
          onParse={handleTableParse}
          onAddTable={handleAddTable}
          onManualAdd={handleAddManualTable}
          error={errors.tables}
          setError={(msg) => setErrors((e) => ({ ...e, tables: msg }))}
        />

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

        {tables.map((table) => (
          <PreviewTable
            key={table.name}
            file={table}
            onRemove={handleRemoveTable}
            onTableNameChange={handleTableNameChange}
            onColumnNameChange={handleColumnNameChange}
            onDataTypeChange={handleDataTypeChange}
            onExcludedChange={handleExcludedChange}
            onAddColumn={handleAddColumn}
            onDeleteColumn={handleDeleteColumn}
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

      {(errors.tables || errors.tableName) && (
        <RABox
          sx={{
            position: "fixed",
            bottom: (theme) => theme.spacing(2),
            right: (theme) => theme.spacing(2),
            zIndex: (theme) => theme.zIndex.snackbar,
            width: 300,
            mb: (theme) => theme.spacing(3),
          }}
        >
          {errors.tables && (
            <RAAlert
              color="error"
              dismissible
              onClose={() => setErrors((e) => ({ ...e, tables: "" }))}
            >
              <RATypography variant="body2" color="white">
                {errors.tables}
              </RATypography>
            </RAAlert>
          )}
          {errors.tableName && (
            <RAAlert
              color="error"
              dismissible
              onClose={() => setErrors((e) => ({ ...e, tableName: "" }))}
            >
              <RATypography variant="body2" color="white">
                {errors.tableName}
              </RATypography>
            </RAAlert>
          )}
        </RABox>
      )}
    </RABox>
  );
}
