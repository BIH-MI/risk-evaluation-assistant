import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";

import getRecipientAssessmentsTableData from "./getRecipientAssessmentsTableData";
import {
  fetchRecipientAssessments,
  fetchRecipientAssessmentsByRecipientId,
  deleteRecipientAssessment,
} from "store/recipientAssessments/recipientAssessmentsThunks";
import { useLockTracker } from "hooks/locks/useLockTracker";

export default function RecipientAssessments() {
  const { recipientId: rawId } = useParams();
  const recipientId = rawId ? Number(rawId) : null;
  const { user } = useAuth();
  const token = user?.access_token;
  const me = user?.profile?.preferred_username;

  const isAdmin = isAdminUser(user);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();

  // Redux data (Extract error to display backend DB conflicts safely)
  const {
    items,
    status,
    error: errorMsg,
  } = useSelector((state) => state.recipientAssessments);

  // Local UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState({
    recipientId: null,
    assessmentId: null,
  });
  const [lockError, setLockError] = useState(null);

  useEffect(() => {
    if (!token) return;
    if (recipientId != null) {
      // Context-specific fetch
      dispatch(fetchRecipientAssessmentsByRecipientId({ recipientId, token }));
    } else {
      // Global fetch
      dispatch(fetchRecipientAssessments(token));
    }
  }, [dispatch, token, recipientId]);

  const sortedAssessments = useMemo(() => {
    if (!Array.isArray(items)) return [];

    return [...items].sort((a, b) => {
      // Sort by lastModifiedDate, fallback to creationDate
      const dateA = new Date(a.lastModifiedDate || a.creationDate);
      const dateB = new Date(b.lastModifiedDate || b.creationDate);
      return dateB - dateA; // Newest first
    });
  }, [items]);

  // --- LOCK TRACKING ---
  const assessmentIds = useMemo(
    () => sortedAssessments.map((a) => String(a.id)),
    [sortedAssessments]
  );

  const { locks, getLockError } = useLockTracker(
    "RECIPIENT_ASSESSMENT",
    assessmentIds
  );

  // Handlers
  const handleEdit = useCallback(
    (rId, aId) => {
      // 2. Bypass lock check if Admin
      if (!isAdmin) {
        const err = getLockError(aId, me);
        if (err) {
          setLockError(err);
          return;
        }
      }

      setLockError(null);
      navigate(`/recipients/${rId}/assessments/${aId}/edit`);
    },
    [getLockError, me, navigate, isAdmin]
  );

  const handleDeleteRequest = useCallback((rId, aId) => {
    setPending({ recipientId: rId, assessmentId: aId });
    setDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    const { recipientId, assessmentId } = pending;
    if (token && recipientId != null && assessmentId != null) {
      dispatch(deleteRecipientAssessment({ recipientId, assessmentId, token }));
    }
    setDialogOpen(false);
    setPending({ recipientId: null, assessmentId: null });
  }, [token, pending, dispatch]);

  const handleDialogClose = useCallback(() => setDialogOpen(false), []);

  // Build table columns & rows
  const { columns, rows } = useMemo(
    () =>
      getRecipientAssessmentsTableData(
        sortedAssessments,
        handleEdit,
        handleDeleteRequest,
        locks,
        me,
        t,
        isAdmin
      ),
    [sortedAssessments, handleEdit, handleDeleteRequest, locks, me, t, isAdmin]
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 65 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          showTotalEntries
          isSorted
          searchColumnKey="organization"
          searchPlaceholder={t("recipientAssessments.list.searchPlaceholder")}
        />
      </RABox>

      <RADialog
        open={dialogOpen}
        title={t("recipientAssessments.list.confirmDeletionTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("recipientAssessments.list.keepIt")}
        confirmText={t("recipientAssessments.list.delete")}
      >
        {t("recipientAssessments.list.deleteWarning")}
      </RADialog>

      {/* Floating Alerts and Status messages */}
      <RABox
        sx={{
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          zIndex: theme.zIndex.snackbar,
          width: 300,
        }}
      >
        {lockError && (
          <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
            <RATypography variant="body2" color="white">
              {lockError}
            </RATypography>
          </RAAlert>
        )}
        {status === "loading" && (
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              {t("recipientAssessments.list.loading")}
            </RATypography>{" "}
          </RAAlert>
        )}
        {status === "failed" && (
          <RAAlert color="error" dismissible>
            <RATypography variant="body2" color="white">
              {/* 4. Use dynamic DB conflict error string if present */}
              {typeof errorMsg === "string"
                ? errorMsg
                : t("recipientAssessments.list.error")}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    </RABox>
  );
}
