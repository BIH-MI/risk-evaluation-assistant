import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RABox from "components/layout/RABox";
import { useLockTracker } from "hooks/locks/useLockTracker";
import { isAdminUser } from "utils/auth";
import {
  deleteProject,
  fetchProjects,
} from "store/projects/projectsThunks";
import getProjectsTableData from "./getProjectsTableData";

export default function Projects() {
  const { user } = useAuth();
  const token = user?.access_token;
  const me = user?.profile?.preferred_username;
  const isAdmin = isAdminUser(user);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { items: rawProjects, status, error } = useSelector(
    (state) => state.projects
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [lockError, setLockError] = useState(null);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchProjects(token));
  }, [dispatch, token]);

  const projects = useMemo(() => {
    if (!Array.isArray(rawProjects)) return [];
    return [...rawProjects].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate);
      const dateB = new Date(b.lastModifiedDate || b.creationDate);
      return dateB - dateA;
    });
  }, [rawProjects]);

  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const { locks, getLockError } = useLockTracker("PROJECT", projectIds);

  const handleAdd = useCallback(() => navigate("/projects/new"), [navigate]);

  const handleEdit = useCallback(
    (id) => {
      if (!id) return;
      if (!isAdmin) {
        const message = getLockError(id, me);
        if (message) {
          setLockError(message);
          return;
        }
      }
      setLockError(null);
      navigate(`/projects/${id}/edit`);
    },
    [getLockError, isAdmin, me, navigate]
  );

  const handleDeleteRequest = useCallback((id) => {
    setToDeleteId(id);
    setDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (token && toDeleteId != null) {
      dispatch(deleteProject({ id: toDeleteId, token }));
    }
    setDialogOpen(false);
    setToDeleteId(null);
  }, [dispatch, toDeleteId, token]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setToDeleteId(null);
  }, []);

  const { columns, rows } = useMemo(
    () =>
      getProjectsTableData(
        projects,
        handleEdit,
        handleDeleteRequest,
        locks,
        me,
        t,
        isAdmin
      ),
    [handleDeleteRequest, handleEdit, isAdmin, locks, me, projects, t]
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
          searchPlaceholder={t("projects.list.searchPlaceholder")}
          onAddClick={handleAdd}
        />
      </RABox>

      <RADialog
        open={dialogOpen}
        title={t("projects.list.confirmDeletionTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("projects.list.keepIt")}
        confirmText={t("projects.list.delete")}
      >
        {t("projects.list.deleteWarning")}
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
            message: status === "loading" ? t("projects.list.loading") : "",
          },
          {
            id: "failed",
            color: "error",
            message: status === "failed" ? error || t("projects.list.error") : "",
          },
        ]}
      />
    </RABox>
  );
}
