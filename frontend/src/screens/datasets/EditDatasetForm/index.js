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
import {
  fetchDatasets,
  updateDataset,
} from "../../../store/datasets/datasetsThunks";
import { useActiveLock } from "../../../hooks/locks/useActiveLock";

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
    tableName: "",
  });
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

  useEffect(() => {
    if (!dataset) return;

    if (formInitialized.current && initializedId.current === dataset.id) {
      return;
    }

    setName(dataset.name || "");
    setDescription(dataset.description || "");
    setTables(dataset.tables || []);

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
  }, [dataset, fetchUsersByUsernames]);

  // --- Handlers ---
  const handleSharedChange = useCallback((users) => {
    const list = Array.isArray(users) ? users : [];
    setSharedUsers(list);
    setSharedUsernames(list.map((u) => u.username));
  }, []);

  const handleTableNameChange = useCallback(
    (tableId, newName) => {
      const dup = tables.some((t) => t.id !== tableId && t.name === newName);
      if (dup) {
        setErrors((e) => ({
          ...e,
          tableName: t("datasets.alerts.duplicateTable", { name: newName }),
        }));
        return false;
      }
      setErrors((e) => ({ ...e, tableName: "" }));
      setTables((prev) =>
        prev.map((tbl) =>
          tbl.id === tableId ? { ...tbl, name: newName } : tbl
        )
      );
      return true;
    },
    [tables, t]
  );

  const handleRemoveTable = useCallback((tableId) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!hasLock) {
        setLockError(t("datasets.alerts.lockLost"));
        return;
      }

      setIsSubmitting(true);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        sharedUsernames,
        tables: tables.map((tbl) => ({
          id: tbl.id,
          name: tbl.name,
          attributes: tbl.attributes.map((a) => ({
            id: typeof a.id === "string" ? null : a.id,
            name: a.name,
            dataType: a.dataType,
            excluded: a.excluded,
          })),
        })),
      };

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
      dispatch,
      token,
      navigate,
      t,
    ]
  );

  const { columnsByTable, addAttr } = useDatasetFormTableConfig(
    tables,
    setTables,
    isReadOnly,
    t
  );

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

          <RABox mt={6}>
            {tables.length > 0 && (
              <RATypography variant="h6" mb={2} textAlign="center">
                {t("datasets.form.datasetTables")}
              </RATypography>
            )}
            {tables.map((tbl) => (
              <RABox key={tbl.id} mb={4}>
                <RABox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <OnBlurRAInput
                    label={t("datasets.form.tableName")}
                    value={tbl.name}
                    onCommit={(newName) =>
                      handleTableNameChange(tbl.id, newName)
                    }
                    variant="standard"
                    sx={{ maxWidth: 300 }}
                    disabled={isReadOnly}
                  />

                  <IconButton
                    size="small"
                    onClick={() => handleRemoveTable(tbl.id)}
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
                    columns: columnsByTable[tbl.id],
                    rows: tbl.attributes,
                  }}
                  canSearch
                  searchColumnKey="name"
                  searchPlaceholder={t("datasets.form.searchAttributes")}
                  pagination={{ enabled: true }}
                  onAddRow={() => addAttr(tbl.id)}
                />
              </RABox>
            ))}
          </RABox>

          <RAButton
            type="submit"
            sx={{ alignSelf: "center", mt: 2 }}
            disabled={isReadOnly}
          >
            {isSubmitting
              ? t("datasets.form.saving")
              : t("datasets.form.saveChanges")}{" "}
          </RAButton>
        </RABox>

        {errors.tableName && (
          <RABox
            sx={{
              position: "fixed",
              bottom: 16,
              right: 16,
              width: 300,
              zIndex: theme.zIndex.snackbar,
            }}
          >
            <RATypography color="error">{errors.tableName}</RATypography>
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
