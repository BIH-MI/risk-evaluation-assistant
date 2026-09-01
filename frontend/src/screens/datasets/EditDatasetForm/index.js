import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

import RABox from "../../../components/layout/RABox";
import RAButton from "../../../components/input/RAButton";
import OnBlurRAInput from "../../../components/input/RAInput/OnBlurRAInput";
import RATypography from "../../../components/display/RATypography";
import DataTable from "../../../components/display/Tables/DataTable";
import RAUserAutocomplete from "../../../components/input/RAUserAutocomplete";
import RAAlert from "../../../components/feedback/RAAlert";

import { useUsersApi } from "../../../api/users";
import { useDatasetFormTableConfig } from "./useDatasetFormTableConfig";
import { buildEditDatasetPayload } from "./buildEditDatasetPayload";
import {
  fetchDatasets,
  updateDataset,
} from "../../../store/datasets/datasetsThunks";
import { useActiveLock } from "../../../hooks/locks/useActiveLock";
import {
  applyDirectIdentifierEvidenceDefaults,
  applySchemaDirectIdentifierEvidence,
  buildDirectIdentifierOverrideWarning,
  buildDirectIdentifierReviewMessage,
  buildDirectIdentifierSubmissionMessage,
  isDefaultExcludedIdentifierColumn,
  validateDirectIdentifierExclusions,
} from "qidDiscovery/directIdentifierPolicy";

export default function EditDatasetForm() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { datasetId: datasetIdParam } = useParams();
  const datasetId = String(datasetIdParam);
  const { user } = useAuth();
  const { t } = useTranslation();
  const token = user?.access_token;

  const allDatasets = useSelector((state) => state.datasets.items || []);

  // --- Form State ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tables, setTables] = useState([]);
  const [errors, setErrors] = useState({
    name: "",
    description: "",
    tables: "",
    tableName: "",
  });
  const [warnings, setWarnings] = useState({ directIdentifier: "" });
  const [sharedUsernames, setSharedUsernames] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Initialization Guard ---
  const formInitialized = useRef(false);
  const initializedId = useRef(null);

  // --- Locking Logic ---
  const [lockError, setLockError] = useState(null);

  const onLockFailed = useCallback(
    (err) => {
      setLockError(t("datasets.alerts.lockFailed"));
      setTimeout(() => navigate("/datasets"), 2000);
    },
    [navigate, t]
  );

  const hasLock = useActiveLock("DATASET", datasetId, onLockFailed);
  const isReadOnly = !hasLock || isSubmitting;

  const { fetchUsersByUsernames } = useUsersApi();

  // --- Data Initialization ---
  const dataset = useMemo(
    () => allDatasets.find((d) => String(d.id) === datasetId),
    [allDatasets, datasetId]
  );
  const directIdentifierValidation = useMemo(
    () => validateDirectIdentifierExclusions(tables),
    [tables]
  );
  const directIdentifierSubmissionMessage = useMemo(
    () => buildDirectIdentifierSubmissionMessage(t, directIdentifierValidation),
    [directIdentifierValidation, t]
  );
  const directIdentifierReviewMessage = useMemo(
    () => buildDirectIdentifierReviewMessage(t, directIdentifierValidation),
    [directIdentifierValidation, t]
  );

  const attachSchemaDirectIdentifierEvidence = useCallback(
    (attribute) =>
      attribute.directIdentifierEvidence
        ? applyDirectIdentifierEvidenceDefaults(attribute)
        : applySchemaDirectIdentifierEvidence(attribute),
    []
  );

  useEffect(() => {
    if (!dataset) return;

    if (formInitialized.current && initializedId.current === dataset.id) {
      return;
    }

    setName(dataset.name || "");
    setDescription(dataset.description || "");
    setTables(
      (dataset.tables || []).map((table) => ({
        ...table,
        attributes: (table.attributes || []).map(
          attachSchemaDirectIdentifierEvidence
        ),
      }))
    );

    const initialUsernames = dataset.sharedUsernames || [];
    setSharedUsernames(initialUsernames);

    if (initialUsernames.length > 0) {
      fetchUsersByUsernames(initialUsernames)
        .then((users) => setSharedUsers(users))
        .catch(() => setSharedUsers([]));
    } else {
      setSharedUsers([]);
    }

    formInitialized.current = true;
    initializedId.current = dataset.id;
  }, [attachSchemaDirectIdentifierEvidence, dataset, fetchUsersByUsernames]);

  // --- Handlers ---
  const handleSharedChange = useCallback((users) => {
    const list = Array.isArray(users) ? users : [];
    setSharedUsers(list);
    setSharedUsernames(list.map((u) => u.username));
  }, []);

  /**
   * Renames a persisted table in form state. Duplicate names are blocked here
   * because table names are used as reviewer-facing context during assessment.
   */
  const handleTableNameChange = useCallback(
    (tableId, newName) => {
      const duplicateName = tables.some(
        (table) => table.id !== tableId && table.name === newName
      );
      if (duplicateName) {
        setErrors((e) => ({
          ...e,
          tableName: t("datasets.alerts.duplicateTable", { name: newName }),
        }));
        return false;
      }
      setErrors((e) => ({ ...e, tableName: "" }));
      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId ? { ...table, name: newName } : table
        )
      );
      return true;
    },
    [tables, t]
  );

  const handleRemoveTable = useCallback((tableId) => {
    setTables((prev) => prev.filter((table) => table.id !== tableId));
  }, []);

  /**
   * Renames an attribute and refreshes schema-only Direct Identifier evidence.
   * Edit Dataset has no raw CSV session, so persisted value-pattern evidence is
   * preserved and only name-derived evidence is recalculated when applicable.
   */
  const handleAttributeNameChange = useCallback((table, attribute, name) => {
    setTables((prev) =>
      prev.map((currentTable) =>
        currentTable.id === table.id
          ? {
              ...currentTable,
              attributes: currentTable.attributes.map((currentAttribute) => {
                if (currentAttribute.id !== attribute.id) {
                  return currentAttribute;
                }

                const renamedAttribute = {
                  ...currentAttribute,
                  name,
                };

                return !currentAttribute.directIdentifierEvidence ||
                  currentAttribute.directIdentifierEvidence.schemaOnly
                  ? applySchemaDirectIdentifierEvidence(renamedAttribute, name)
                  : renamedAttribute;
              }),
            }
          : currentTable
      )
    );
  }, []);

  /**
   * Applies the user's QID-candidacy decision for an existing attribute.
   * Unchecking a default-excluded identifier records an override so future
   * schema-only refreshes do not silently re-exclude it.
   */
  const handleExcludedChange = useCallback(
    (table, attribute, excluded) => {
      const overrideWarning = buildDirectIdentifierOverrideWarning(
        t,
        attribute,
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

      setTables((prev) =>
        prev.map((currentTable) =>
          currentTable.id === table.id
            ? {
                ...currentTable,
                attributes: currentTable.attributes.map((currentAttribute) =>
                  currentAttribute.id === attribute.id
                    ? {
                        ...currentAttribute,
                        excluded,
                        directIdentifierExclusionOverridden:
                          !excluded &&
                          isDefaultExcludedIdentifierColumn(currentAttribute),
                      }
                    : currentAttribute
                ),
              }
            : currentTable
        )
      );
    },
    [t]
  );

  /**
   * Saves the reviewed schema and aggregate QID metadata. Edit Dataset never
   * reconstructs raw rows, so obsolete combinations are filtered by included
   * attributes before the payload is sent.
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!hasLock) {
        setLockError(t("datasets.alerts.lockLost"));
        return;
      }
      if (!directIdentifierValidation.canSubmit) {
        setErrors((current) => ({
          ...current,
          tables: directIdentifierSubmissionMessage,
        }));
        return;
      }

      setIsSubmitting(true);

      const payload = buildEditDatasetPayload(tables, {
        name,
        description,
        sharedUsernames,
      });

      try {
        await dispatch(
          updateDataset({ datasetId, updatedDataset: payload, token })
        ).unwrap();
        dispatch(fetchDatasets(token));
        navigate("/datasets");
      } catch (err) {
        setLockError(err.message || t("datasets.alerts.saveFailed"));
        setIsSubmitting(false);
      }
    },
    [
      datasetId,
      name,
      description,
      sharedUsernames,
      tables,
      hasLock,
      directIdentifierValidation,
      directIdentifierSubmissionMessage,
      dispatch,
      token,
      navigate,
      t,
    ]
  );

  const { columnsByTable, addAttr } = useDatasetFormTableConfig({
    tables,
    setTables,
    disabled: isReadOnly,
    t,
    onExcludedChange: handleExcludedChange,
    onAttributeNameChange: handleAttributeNameChange,
  });
  const disableSubmit = isReadOnly || !directIdentifierValidation.canSubmit;

  return (
    <>
      <RABox px={4} py={8}>
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
            {t("datasets.form.editDataset")}
          </RATypography>

          <OnBlurRAInput
            label={t("datasets.form.datasetNameLabel")}
            value={name}
            onCommit={setName}
            fullWidth
            disabled={isReadOnly}
          />
          <OnBlurRAInput
            label={t("datasets.form.datasetDescriptionLabel")}
            value={description}
            onCommit={setDescription}
            multiline
            rows={3}
            fullWidth
            disabled={isReadOnly}
          />

          <RAUserAutocomplete
            multiple
            label={t("datasets.form.sharedUsers")}
            value={sharedUsers}
            onChange={(_e, newUsers) => handleSharedChange(newUsers)}
            disabled={isReadOnly}
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

          {directIdentifierReviewMessage && (
            <RABox
              sx={{
                p: 1.5,
                borderLeft: "4px solid",
                borderColor: "info.main",
                bgcolor: "rgba(3, 169, 244, 0.08)",
                borderRadius: 1,
              }}
            >
              <RATypography
                variant="body2"
                sx={{ whiteSpace: "pre-line", color: "text.primary" }}
              >
                {directIdentifierReviewMessage}
              </RATypography>
            </RABox>
          )}

          <RABox mt={6}>
            {tables.length > 0 && (
              <RATypography variant="h6" mb={2} textAlign="center">
                {t("datasets.form.datasetTables")}
              </RATypography>
            )}
            {tables.map((table) => (
              <RABox key={table.id} mb={4}>
                <RABox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <OnBlurRAInput
                    label={t("datasets.form.tableName")}
                    value={table.name}
                    onCommit={(newName) =>
                      handleTableNameChange(table.id, newName)
                    }
                    variant="standard"
                    sx={{ maxWidth: 300 }}
                    disabled={isReadOnly}
                  />

                  <IconButton
                    size="small"
                    onClick={() => handleRemoveTable(table.id)}
                    disabled={isReadOnly}
                    sx={{
                      bgcolor: "error.main",
                      color: "#fff",
                      "&:hover": { bgcolor: "error.dark" },
                      width: 28,
                      height: 28,
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </RABox>

                <DataTable
                  table={{
                    columns: columnsByTable[table.id],
                    rows: table.attributes,
                  }}
                  canSearch
                  searchColumnKey="name"
                  searchPlaceholder={t("datasets.form.searchAttributes")}
                  pagination={{ enabled: true }}
                  onAddRow={() => addAttr(table.id)}
                />
              </RABox>
            ))}
          </RABox>

          <RAButton
            type="submit"
            sx={{ alignSelf: "center", mt: 2 }}
            disabled={disableSubmit}
          >
            {isSubmitting
              ? t("datasets.form.saving")
              : t("datasets.form.saveChanges")}{" "}
          </RAButton>
        </RABox>

        {(errors.tables || errors.tableName || warnings.directIdentifier) && (
          <RABox
            sx={{
              position: "fixed",
              bottom: 16,
              right: 16,
              width: 300,
              zIndex: theme.zIndex.snackbar,
            }}
          >
            {errors.tables && (
              <RAAlert
                color="error"
                dismissible
                onClose={() => setErrors((e) => ({ ...e, tables: "" }))}
              >
                <RATypography
                  variant="body2"
                  color="white"
                  sx={{ whiteSpace: "pre-line" }}
                >
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
            {warnings.directIdentifier && (
              <RAAlert
                color="warning"
                dismissible
                onClose={() =>
                  setWarnings((current) => ({
                    ...current,
                    directIdentifier: "",
                  }))
                }
              >
                <RATypography
                  variant="body2"
                  color="white"
                  sx={{ whiteSpace: "pre-line" }}
                >
                  {warnings.directIdentifier}
                </RATypography>
              </RAAlert>
            )}
          </RABox>
        )}
      </RABox>

      {lockError && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            width: 300,
            zIndex: theme.zIndex.snackbar,
          }}
        >
          <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
            <RATypography variant="body2" color="white">
              {lockError}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </>
  );
}
