import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import { isAdminUser } from "utils/auth";

import getDatasetAssessmentsTableData from "./getDatasetAssessmentsTableData";
import {
  fetchDatasetAssessments,
  fetchDatasetAssessmentsByDatasetId,
  deleteDatasetAssessment,
} from "store/datasetAssessments/datasetAssessmentsThunks";

import { useLockTracker } from "hooks/locks/useLockTracker";

export default function DatasetAssessments() {
  const { datasetId: rawId } = useParams();
  const datasetId = rawId ? Number(rawId) : null;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { t } = useTranslation();
  const token = user?.access_token;
  const me = user?.profile?.preferred_username;

  const isAdmin = isAdminUser(user);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState({
    datasetId: null,
    assessmentId: null,
  });

  const [lockError, setLockError] = useState(null);

  // Redux data
  const {
    items: assessments,
    status,
    error: errorMsg, // 2. Extract error message to show backend conflicts
  } = useSelector((state) => state.datasetAssessments);

  // Fetch assessments
  useEffect(() => {
    if (!token) return;
    if (datasetId != null) {
      dispatch(fetchDatasetAssessmentsByDatasetId({ datasetId, token }));
    } else {
      dispatch(fetchDatasetAssessments(token));
    }
  }, [dispatch, token, datasetId]);

  const sortedAssessments = useMemo(() => {
    if (!Array.isArray(assessments)) return [];
    return [...assessments].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate);
      const dateB = new Date(b.lastModifiedDate || b.creationDate);
      return dateB - dateA;
    });
  }, [assessments]);

  // Prepare stable list of IDs
  const assessmentIds = useMemo(
    () => sortedAssessments.map((a) => String(a.id)),
    [sortedAssessments]
  );

  // Use the hook to track locks
  const { locks, getLockError } = useLockTracker(
    "DATASET_ASSESSMENT",
    assessmentIds
  );

  // Edit handler
  const handleEdit = (dsId, assessmentId) => {
    // 3. Bypass lock check if user is Admin
    if (!isAdmin) {
      const error = getLockError(assessmentId, me);
      if (error) {
        setLockError(error);
        return;
      }
    }

    setLockError(null);
    navigate(`/datasets/${dsId}/assessments/${assessmentId}/edit`, {
      state: { assessmentId },
    });
  };

  // Delete handlers
  const handleDeleteRequest = (dsId, assessmentId) => {
    setPendingDelete({ datasetId: dsId, assessmentId });
    setDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    const { datasetId: dsId, assessmentId } = pendingDelete;
    if (token && dsId != null && assessmentId != null) {
      dispatch(
        deleteDatasetAssessment({ datasetId: dsId, assessmentId, token })
      );
    }
    setDialogOpen(false);
    setPendingDelete({ datasetId: null, assessmentId: null });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setPendingDelete({ datasetId: null, assessmentId: null });
  };

  // Table setup
  const { columns, rows } = getDatasetAssessmentsTableData(
    sortedAssessments,
    handleEdit,
    handleDeleteRequest,
    locks,
    me,
    t,
    isAdmin
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 65 } }}>
        <DataTable
          table={{ columns, rows }}
          showTotalEntries
          isSorted
          noEndBorder
          canSearch
          searchColumnKey="name"
          searchPlaceholder={t("datasetAssessments.list.searchPlaceholder")}
        />
      </RABox>

      <RADialog
        open={dialogOpen}
        title={t("datasetAssessments.list.confirmDeletionTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("datasetAssessments.list.keepIt")}
        confirmText={t("datasetAssessments.list.delete")}
      >
        {t("datasetAssessments.list.deleteWarning")}
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
            message:
              status === "loading" ? t("datasetAssessments.list.loading") : "",
          },
          {
            id: "failed",
            color: "error",
            // Prints the actual backend error when present.
            message:
              status === "failed"
                ? typeof errorMsg === "string"
                  ? errorMsg
                  : t("datasetAssessments.list.error")
                : "",
          },
        ]}
      />
    </RABox>
  );
}
