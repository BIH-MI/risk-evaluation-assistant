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
  archiveMitigationKnowledgeBaseApi,
  fetchMitigationKnowledgeBasesApi,
  forkMitigationKnowledgeBaseApi,
  setDefaultMitigationKnowledgeBaseApi,
} from "api/mitigationKnowledgeBases";

import getMitigationKnowledgeBaseTableData from "./getMitigationKnowledgeBaseTableData";

export default function MitigationKnowledgeBases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);

  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);

  const loadKnowledgeBases = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchMitigationKnowledgeBasesApi(token);
      setKnowledgeBases(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMsg(error.message || "Failed to load mitigation Knowledge Bases.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadKnowledgeBases();
  }, [loadKnowledgeBases]);

  const sortedKnowledgeBases = useMemo(
    () =>
      [...knowledgeBases].sort((a, b) => {
        const defaultOrder =
          Number(Boolean(b.defaultKnowledgeBase)) -
          Number(Boolean(a.defaultKnowledgeBase));
        if (defaultOrder !== 0) return defaultOrder;
        const activeOrder = Number(Boolean(b.active)) - Number(Boolean(a.active));
        if (activeOrder !== 0) return activeOrder;
        return new Date(b.lastModifiedDate || b.creationDate || 0) -
          new Date(a.lastModifiedDate || a.creationDate || 0);
      }),
    [knowledgeBases]
  );

  const handleFork = useCallback(
    async (knowledgeBase) => {
      if (!token) return;
      try {
        const fork = await forkMitigationKnowledgeBaseApi(
          knowledgeBase.id,
          { name: `${knowledgeBase.name} Fork` },
          token
        );
        await loadKnowledgeBases();
        navigate(`/configuration/mitigation-knowledge-bases/${fork.id}/edit`);
      } catch (error) {
        setErrorMsg(error.message || "Failed to fork mitigation Knowledge Base.");
      }
    },
    [loadKnowledgeBases, navigate, token]
  );

  const handleSetDefault = useCallback(
    async (knowledgeBase) => {
      if (!token) return;
      try {
        await setDefaultMitigationKnowledgeBaseApi(knowledgeBase.id, token);
        await loadKnowledgeBases();
      } catch (error) {
        setErrorMsg(error.message || "Failed to set default mitigation Knowledge Base.");
      }
    },
    [loadKnowledgeBases, token]
  );

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget || !token) return;
    try {
      await archiveMitigationKnowledgeBaseApi(archiveTarget.id, token);
      setArchiveTarget(null);
      await loadKnowledgeBases();
    } catch (error) {
      setErrorMsg(error.message || "Failed to archive mitigation Knowledge Base.");
      setArchiveTarget(null);
    }
  }, [archiveTarget, loadKnowledgeBases, token]);

  const { columns, rows } = useMemo(
    () =>
      getMitigationKnowledgeBaseTableData(
        sortedKnowledgeBases,
        (knowledgeBase) =>
          navigate(`/configuration/mitigation-knowledge-bases/${knowledgeBase.id}/edit`),
        handleFork,
        handleSetDefault,
        setArchiveTarget
      ),
    [handleFork, handleSetDefault, navigate, sortedKnowledgeBases]
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd={isAdmin}
          searchColumnKey="displayName"
          searchPlaceholder="Search mitigation Knowledge Bases..."
          onAddClick={() => navigate("/configuration/mitigation-knowledge-bases/new")}
        />
      </RABox>

      <RADialog
        open={Boolean(archiveTarget)}
        title="Archive Mitigation Knowledge Base"
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        cancelText="Cancel"
        confirmText="Archive"
      >
        <RATypography variant="body2">
          Archive {archiveTarget?.name}? Projects already pinned to one of its
          versions remain reproducible, but this Knowledge Base will no longer
          be selectable for new Projects.
        </RATypography>
      </RADialog>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message: loading ? "Loading mitigation Knowledge Bases..." : "",
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
