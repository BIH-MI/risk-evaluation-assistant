import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

import DataTable from "components/display/Tables/DataTable";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";
import {
  archiveAttributeScoringSystemApi,
  duplicateAttributeScoringSystemApi,
  fetchAttributeScoringSystemsApi,
  setDefaultAttributeScoringSystemApi,
} from "api/attributeScoringSystems";

import getScoringSystemTableData from "./getScoringSystemTableData";

export default function AttributeScoringSystems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);

  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);

  const loadSystems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchAttributeScoringSystemsApi(token);
      setSystems(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message || "Failed to load scoring systems.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSystems();
  }, [loadSystems]);

  const sortedSystems = useMemo(() => {
    return [...systems].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate || 0);
      const dateB = new Date(b.lastModifiedDate || b.creationDate || 0);
      return dateB - dateA;
    });
  }, [systems]);

  const openCreateDialog = useCallback(() => {
    navigate("/configuration/attribute-scoring-systems/new");
  }, [navigate]);

  const openEditDialog = useCallback((system) => {
    navigate(`/configuration/attribute-scoring-systems/${system.id}/edit`);
  }, [navigate]);

  const handleDuplicate = useCallback(
    async (system) => {
      if (!token) return;
      try {
        await duplicateAttributeScoringSystemApi(system.id, token);
        await loadSystems();
      } catch (err) {
        setErrorMsg(err.message || "Failed to duplicate scoring system.");
      }
    },
    [loadSystems, token]
  );

  const handleSetDefault = useCallback(
    async (system) => {
      if (!token) return;
      try {
        await setDefaultAttributeScoringSystemApi(system.id, token);
        await loadSystems();
      } catch (err) {
        setErrorMsg(err.message || "Failed to set default scoring system.");
      }
    },
    [loadSystems, token]
  );

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget || !token) return;
    try {
      await archiveAttributeScoringSystemApi(archiveTarget.id, token);
      setArchiveTarget(null);
      await loadSystems();
    } catch (err) {
      setErrorMsg(err.message || "Failed to archive scoring system.");
      setArchiveTarget(null);
    }
  }, [archiveTarget, loadSystems, token]);

  const { columns, rows } = useMemo(
    () =>
      getScoringSystemTableData(
        sortedSystems,
        openEditDialog,
        handleDuplicate,
        handleSetDefault,
        setArchiveTarget,
        isAdmin
      ),
    [handleDuplicate, handleSetDefault, isAdmin, openEditDialog, sortedSystems]
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd={isAdmin}
          searchColumnKey="displayName"
          searchPlaceholder="Search scoring systems..."
          onAddClick={isAdmin ? openCreateDialog : undefined}
        />
      </RABox>

      <RADialog
        open={Boolean(archiveTarget)}
        title="Archive Scoring System"
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        cancelText="Cancel"
        confirmText="Archive"
      >
        <RATypography variant="body2">
          Archive {archiveTarget?.name}? Existing assessments will keep using
          their saved scoring-system version, but this system will no longer be
          selectable for new assessments.
        </RATypography>
      </RADialog>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message: loading ? "Loading scoring systems..." : "",
          },
          {
            id: "errorMsg",
            color: "error",
            message: errorMsg,
            onClose: () => setErrorMsg(""),
          },
        ]}
      />
    </RABox>
  );
}
