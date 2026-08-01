import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";

import {
  deleteRecipient,
  fetchRecipients,
} from "store/recipients/recipientsThunks";
import getRecipientsTableData from "./getRecipientsTableData";

import { fetchRecipientAssessments } from "../../store/recipientAssessments/recipientAssessmentsThunks";
import { useLockTracker } from "hooks/locks/useLockTracker";

export default function Recipients() {
  const { user } = useAuth();
  const token = user?.access_token;
  const me = user?.profile?.preferred_username;

  const isAdmin = isAdminUser(user);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Redux state
  const {
    items: rawRecipients,
    status,
    error, // Extract error to show DB conflicts
  } = useSelector((state) => state.recipients);

  // Local UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [lockError, setLockError] = useState(null);

  // Fetch recipients & assessments
  useEffect(() => {
    if (!token) return;
    dispatch(fetchRecipients(token));
    dispatch(fetchRecipientAssessments(token));
  }, [dispatch, token]);

  const recipients = useMemo(() => {
    if (!Array.isArray(rawRecipients)) return [];
    return [...rawRecipients].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate);
      const dateB = new Date(b.lastModifiedDate || b.creationDate);
      return dateB - dateA;
    });
  }, [rawRecipients]);

  // --- Locking
  const recipientIds = useMemo(
    () => recipients.map((r) => String(r.id)),
    [recipients]
  );

  const { locks, getLockError } = useLockTracker("RECIPIENT", recipientIds);

  // Handlers
  const handleAdd = useCallback(() => navigate("/recipients/new"), [navigate]);

  const handleEdit = useCallback(
    (recipientId) => {
      // 2. Bypass lock check if Admin
      if (!isAdmin) {
        const err = getLockError(recipientId, me);
        if (err) {
          setLockError(err);
          return;
        }
      }

      setLockError(null);
      const rec = recipients.find((r) => r.id === recipientId);
      if (rec) {
        navigate(`/recipients/${recipientId}/edit`, {
          state: { recipient: rec, preLocked: true },
        });
      }
    },
    [getLockError, me, recipients, navigate, isAdmin]
  );

  const handleViewAssessments = useCallback(
    (recipientId) => navigate(`/recipients/${recipientId}/assessments`),
    [navigate]
  );

  const handleAddAssessment = useCallback(
    (recipientId) => navigate(`/recipients/${recipientId}/assessments/new`),
    [navigate]
  );

  const handleDeleteRequest = useCallback((recipientId) => {
    setToDeleteId(recipientId);
    setDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (token && toDeleteId != null) {
      dispatch(deleteRecipient({ id: toDeleteId, token }));
    }
    setDialogOpen(false);
  }, [dispatch, toDeleteId, token]);

  const handleDialogClose = useCallback(() => setDialogOpen(false), []);

  // Build table
  const { columns, rows } = useMemo(
    () =>
      getRecipientsTableData(
        recipients,
        handleEdit,
        handleDeleteRequest,
        handleViewAssessments,
        handleAddAssessment,
        locks,
        me,
        t,
        isAdmin // 3. Pass flag to table generator
      ),
    [
      recipients,
      handleEdit,
      handleDeleteRequest,
      handleViewAssessments,
      handleAddAssessment,
      locks,
      me,
      t,
      isAdmin,
    ]
  );

  return (
    <RABox>
      <RABox py={3}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          searchColumnKey="name"
          searchPlaceholder={t("recipients.list.searchPlaceholder")}
          canAdd
          onAddClick={handleAdd}
        />
      </RABox>

      <RADialog
        open={dialogOpen}
        title={t("recipients.list.deleteTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("recipients.list.cancel")}
        confirmText={t("recipients.list.delete")}
      >
        {t("recipients.list.deleteWarning")}
      </RADialog>

      <RABox
        sx={(theme) => ({
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          zIndex: theme.zIndex.snackbar,
          width: 300,
          marginBottom: theme.spacing(3),
        })}
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
              {t("recipients.list.loading")}
            </RATypography>
          </RAAlert>
        )}
        {status === "failed" && (
          <RAAlert color="error" dismissible>
            <RATypography variant="body2" color="white">
              {/* 4. Display the Redux error message (like 409 DB Conflicts) */}
              {typeof error === "string" ? error : t("recipients.list.error")}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    </RABox>
  );
}
