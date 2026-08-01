import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";

import getDataSharingActivitiesTableData from "./getDataSharingActivitiesTableData";
import {
  fetchDataSharingActivities,
  deleteDataSharingActivity,
} from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { fetchDatasets } from "../../store/datasets/datasetsThunks";
import { fetchRecipients } from "../../store/recipients/recipientsThunks";
import { fetchDatasetAssessments } from "../../store/datasetAssessments/datasetAssessmentsThunks";
import { fetchRecipientAssessments } from "../../store/recipientAssessments/recipientAssessmentsThunks";
import { useLockTracker } from "hooks/locks/useLockTracker";

export default function DataSharingActivities() {
  const theme = useTheme();
  const { user } = useAuth();
  const token = user?.access_token;
  const me = user?.profile?.preferred_username;

  const isAdmin = isAdminUser(user);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Local state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  // locks state is now managed by the hook
  const [lockError, setLockError] = useState(null);

  // Pull in the list from Redux
  const {
    items: rawActivities,
    status,
    error, // Extract error to show DB conflicts
  } = useSelector((state) => state.dataSharingActivities);

  // Fetch all activities once we have a token
  useEffect(() => {
    if (!token) return;
    dispatch(fetchDatasets(token));
    dispatch(fetchRecipients(token));
    dispatch(fetchDataSharingActivities(token));
    dispatch(fetchDatasetAssessments(token));
    dispatch(fetchRecipientAssessments(token));
  }, [dispatch, token]);

  const activities = useMemo(() => {
    if (!Array.isArray(rawActivities)) return [];
    return [...rawActivities].sort((a, b) => {
      // Use lastModifiedDate if available, otherwise fallback to creationDate
      const dateA = new Date(a.lastModifiedDate || a.creationDate);
      const dateB = new Date(b.lastModifiedDate || b.creationDate);
      return dateB - dateA;
    });
  }, [rawActivities]);

  const activityIds = useMemo(
    () => activities.map((a) => String(a.id)),
    [activities]
  );

  // Use the standard hook for polling and lock management
  const { locks, getLockError } = useLockTracker(
    "DATA_SHARING_ACTIVITY",
    activityIds
  );

  // Handlers
  const handleAdd = useCallback(
    () => navigate("/data-sharing-activities/new"),
    [navigate]
  );

  const handleEdit = useCallback(
    (id) => {
      if (!id) return;

      // 2. Bypass lock check if Admin
      if (!isAdmin) {
        // Use helper from hook to check lock status
        const err = getLockError(id, me);
        if (err) {
          setLockError(err);
          return;
        }
      }

      setLockError(null);
      navigate(`/data-sharing-activities/${id}/edit`);
    },
    [navigate, getLockError, me, isAdmin]
  );

  const handleViewReport = useCallback(
    (id) => {
      if (id) {
        navigate(`/data-sharing-activities/${id}/report`);
      }
    },
    [navigate]
  );

  const handleDeleteRequest = useCallback((id) => {
    setToDeleteId(id);
    setDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (token && toDeleteId != null) {
      dispatch(deleteDataSharingActivity({ id: toDeleteId, token }));
    }
    setDialogOpen(false);
    setToDeleteId(null);
  }, [token, toDeleteId, dispatch]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setToDeleteId(null);
  }, []);

  // Build table columns & rows
  const { columns, rows } = useMemo(
    () =>
      getDataSharingActivitiesTableData(
        activities,
        handleEdit,
        handleDeleteRequest,
        handleViewReport,
        locks, // Pass locks from hook
        me,
        t,
        isAdmin // 3. Pass flag to table generator
      ),
    [
      activities,
      handleEdit,
      handleDeleteRequest,
      handleViewReport,
      locks,
      me,
      t,
      isAdmin,
    ]
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 65 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd
          showTotalEntries
          isSorted
          searchColumnKey="datasetAssessmentName"
          searchPlaceholder={t("dataSharingActivities.list.searchPlaceholder")}
          onAddClick={handleAdd}
        />
      </RABox>

      <RADialog
        open={dialogOpen}
        title={t("dataSharingActivities.list.confirmDeletionTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("dataSharingActivities.list.keepIt")}
        confirmText={t("dataSharingActivities.list.delete")}
      >
        {t("dataSharingActivities.list.deleteWarning")}
      </RADialog>

      {/* Lock error */}
      {lockError && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            zIndex: theme.zIndex.snackbar,
            width: 300,
          }}
        >
          <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
            <RATypography variant="body2" color="white">
              {lockError}
            </RATypography>
          </RAAlert>
        </RABox>
      )}

      {/* Loading / fetch errors */}
      {status === "loading" && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            zIndex: theme.zIndex.snackbar,
            width: 300,
          }}
        >
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              {t("dataSharingActivities.list.loading")}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
      {status === "failed" && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            zIndex: theme.zIndex.snackbar,
            width: 300,
          }}
        >
          <RAAlert color="error" dismissible>
            <RATypography variant="body2" color="white">
              {/* 4. Display the Redux error message for DB conflicts */}
              {typeof error === "string"
                ? error
                : t("dataSharingActivities.list.error")}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </RABox>
  );
}
