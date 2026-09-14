import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RABox from "components/layout/RABox";
import { isAdminUser } from "utils/auth";
import getDatasetsTableData from "./getDatasetsTableData";

import {
  deleteDataset,
  fetchDatasets,
} from "../../store/datasets/datasetsThunks";
import { useLockTracker } from "../../hooks/locks/useLockTracker";

export default function Datasets() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const token = user?.access_token;
  const me = user?.profile?.preferred_username;

  const isAdmin = isAdminUser(user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [lockError, setLockError] = useState(null);

  const status = useSelector((state) => state.datasets.status);
  const rawItems = useSelector((state) => state.datasets.items);
  const errorMsg = useSelector((state) => state.datasets.error);

  const datasets = useMemo(() => {
    if (!Array.isArray(rawItems)) return [];
    return [...rawItems].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate);
      const dateB = new Date(b.lastModifiedDate || b.creationDate);
      return dateB - dateA;
    });
  }, [rawItems]);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchDatasets(token));
  }, [dispatch, token]);

  const datasetIds = useMemo(() => datasets.map((d) => d.id), [datasets]);
  const { locks, getLockError } = useLockTracker("DATASET", datasetIds);

  const handleAdd = useCallback(() => navigate("/datasets/new"), [navigate]);

  const handleEdit = useCallback(
    (id) => {
      if (!id) return;
      if (!isAdmin) {
        const error = getLockError(id, me);
        if (error) {
          setLockError(error);
          return;
        }
      }
      setLockError(null);
      navigate(`/datasets/${id}/edit`);
    },
    [getLockError, me, navigate, isAdmin]
  );

  const handleDeleteRequest = useCallback((id) => {
    setToDeleteId(id);
    setDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (token && toDeleteId != null) {
      dispatch(deleteDataset({ datasetId: toDeleteId, token }));
    }
    setDialogOpen(false);
    setToDeleteId(null);
  }, [token, toDeleteId, dispatch]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setToDeleteId(null);
  }, []);

  const handleViewAssessments = useCallback(
    (datasetId) => {
      navigate(`/datasets/${datasetId}/assessments`);
    },
    [navigate]
  );

  const handleAddAssessment = useCallback(
    (datasetId) => {
      navigate(`/datasets/${datasetId}/assessments/new`);
    },
    [navigate]
  );

  const { columns, rows } = useMemo(
    () =>
      getDatasetsTableData(
        datasets,
        handleEdit,
        handleDeleteRequest,
        locks,
        me,
        handleViewAssessments,
        handleAddAssessment,
        t,
        isAdmin
      ),
    [
      datasets,
      handleEdit,
      handleDeleteRequest,
      locks,
      me,
      handleViewAssessments,
      handleAddAssessment,
      t,
      isAdmin,
    ]
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd
          showTotalEntries
          isSorted
          searchColumnKey="name"
          searchPlaceholder={t("datasets.searchPlaceholder")}
          onAddClick={handleAdd}
        />
      </RABox>

      <RADialog
        open={dialogOpen}
        title={t("datasets.dialog.confirmDeletionTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("datasets.dialog.keepIt")}
        confirmText={t("datasets.dialog.delete")}
      >
        {t("datasets.dialog.deleteWarning")}
      </RADialog>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "lockError",
            color: "error",
            message: lockError,
            onClose: () => setLockError(null),
          },
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message: status === "loading" ? t("datasets.alerts.loading") : "",
          },
          {
            id: "failed",
            color: "error",
            message:
              status === "failed"
                ? typeof errorMsg === "string"
                  ? errorMsg
                  : t(
                      "datasets.alerts.error",
                      "Action failed. The dataset is locked or has existing assessments."
                    )
                : "",
          },
        ]}
      />
    </RABox>
  );
}
