// src/screens/datasets/AddDatasetForm/index.js
import React, { useCallback, useState } from "react";
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

  // --- CSV handlers ---

  const handleAddTable = useCallback(
    (file) => {
      setTables((prev) => {
        if (prev.some((t) => t.name === file.name)) {
          setErrors((e) => ({
            ...e,
            tables: t("datasets.alerts.duplicateCsv", { name: file.name }),
          }));
          return prev;
        }
        setErrors((e) => ({ ...e, tables: "" }));
        return [...prev, { name: file.name, isParsing: true, isManual: false }];
      });
    },
    [t]
  );

  const handleTableParse = useCallback((meta) => {
    setTables((prev) => {
      return prev.map((t) =>
        t.name === meta.name
          ? { ...meta, isParsing: false, isManual: false }
          : t
      );
    });
  }, []);

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
          name: newName,
          columnMeta: [],
          data: [],
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
              { field: fieldName, level: "STRING", excluded: false },
            ],
          };
        })
      );
    },
    [t]
  );

  const handleDeleteColumn = useCallback((tableName, fieldName) => {
    setTables((prev) =>
      prev.map((t) =>
        t.name === tableName
          ? {
              ...t,
              columnMeta: t.columnMeta.filter((c) => c.field !== fieldName),
            }
          : t
      )
    );
  }, []);

  // --- Common Handlers ---

  const handleRemoveTable = useCallback((tableName) => {
    setTables((prev) => prev.filter((t) => t.name !== tableName));
    setErrors((e) => ({ ...e, tableName: "" }));
  }, []);

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
      setTables((prev) =>
        prev.map((t) =>
          t.name === tableName
            ? {
                ...t,
                columnMeta: t.columnMeta.map((c) =>
                  c.field === oldField ? { ...c, field: newField } : c
                ),
              }
            : t
        )
      );
    },
    []
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

  const handleExcludedChange = useCallback((tableName, field, excluded) => {
    setTables((prev) =>
      prev.map((t) =>
        t.name === tableName
          ? {
              ...t,
              columnMeta: t.columnMeta.map((c) =>
                c.field === field ? { ...c, excluded } : c
              ),
            }
          : t
      )
    );
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!name.trim()) return;
      if (!tables.length) {
        setErrors((e) => ({ ...e, tables: t("datasets.alerts.noTables") }));
        return;
      }
      if (tables.some((table) => table.isParsing)) {
        setErrors((e) => ({
          ...e,
          tables: t("datasets.alerts.parsingInProgress", "Please wait until all CSV files finish parsing."),
        }));
        return;
      }

      const payloadTables = tables.map(({ name: fileName, columnMeta = [] }) => ({
        name: fileName.replace(/\.csv$/i, ""),
        attributes: columnMeta.map(({ field, level, excluded }) => ({
          name: field,
          dataType: level,
          excluded,
        })),
      }));

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
    !name.trim() || !tables.length || tables.some((table) => table.isParsing);

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
