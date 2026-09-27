import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate, useParams } from "react-router-dom";
import {
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
} from "@mui/material";

import DataTable from "components/display/Tables/DataTable";
import RAAlert from "components/feedback/RAAlert";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";
import {
  createMitigationKnowledgeBaseApi,
  fetchMitigationActionsApi,
  fetchMitigationKnowledgeBaseApi,
  updateMitigationKnowledgeBaseApi,
} from "api/mitigationKnowledgeBases";

import getMitigationActionsTableData from "./getMitigationActionsTableData";

const LIST_ROUTE = "/configuration/mitigation-knowledge-bases";

const sectionSx = {
  p: { xs: 2.5, md: 3 },
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
};

export default function EditMitigationKnowledgeBase() {
  const { knowledgeBaseId } = useParams();
  const isEditMode = Boolean(knowledgeBaseId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);

  const [form, setForm] = useState({
    name: "",
    description: "",
    active: true,
    defaultKnowledgeBase: false,
  });
  // The persisted default can only change by making another Knowledge Base the default.
  const [isPersistedDefault, setIsPersistedDefault] = useState(false);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    if (!token || !isAdmin || !isEditMode) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [knowledgeBase, actionData] = await Promise.all([
        fetchMitigationKnowledgeBaseApi(knowledgeBaseId, token),
        fetchMitigationActionsApi(knowledgeBaseId, token),
      ]);
      setForm({
        name: knowledgeBase.name || "",
        description: knowledgeBase.description || "",
        active: Boolean(knowledgeBase.active),
        defaultKnowledgeBase: Boolean(knowledgeBase.defaultKnowledgeBase),
      });
      setIsPersistedDefault(Boolean(knowledgeBase.defaultKnowledgeBase));
      setActions(Array.isArray(actionData) ? actionData : []);
    } catch (error) {
      setErrorMsg(error.message || "Failed to load mitigation Knowledge Base.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isEditMode, knowledgeBaseId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedActions = useMemo(
    () =>
      [...actions].sort((a, b) =>
        `${a.actionType || ""}:${a.code || ""}`.localeCompare(
          `${b.actionType || ""}:${b.code || ""}`
        )
      ),
    [actions]
  );

  const { columns, rows } = useMemo(
    () =>
      getMitigationActionsTableData(sortedActions, (action) =>
        navigate(
          `/configuration/mitigation-knowledge-bases/${knowledgeBaseId}/actions/${action.id}/edit`
        )
      ),
    [knowledgeBaseId, navigate, sortedActions]
  );

  const updateField = useCallback((field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSave = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token || saving || !form.name.trim()) return;
      setSaving(true);
      setErrorMsg("");
      try {
        const payload = {
          name: form.name.trim(),
          description: form.description.trim(),
          active: form.active,
          defaultKnowledgeBase: form.defaultKnowledgeBase,
        };
        const saved = isEditMode
          ? await updateMitigationKnowledgeBaseApi(knowledgeBaseId, payload, token)
          : await createMitigationKnowledgeBaseApi(payload, token);
        setIsPersistedDefault(Boolean(saved.defaultKnowledgeBase));
        navigate(`/configuration/mitigation-knowledge-bases/${saved.id}/edit`);
      } catch (error) {
        setErrorMsg(error.message || "Failed to save mitigation Knowledge Base.");
      } finally {
        setSaving(false);
      }
    },
    [form, isEditMode, knowledgeBaseId, navigate, saving, token]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            Only administrators can manage mitigation Knowledge Bases.
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  if (loading) {
    return (
      <RABox p={5} display="flex" justifyContent="center">
        <CircularProgress size={60} thickness={4} color="primary" disableShrink />
      </RABox>
    );
  }

  return (
    <RABox
      component="form"
      onSubmit={handleSave}
      display="flex"
      flexDirection="column"
      maxWidth="1100px"
      width="100%"
      mx="auto"
      gap={3}
      p={2}
    >
      <RATypography variant="h4" fontWeight="bold" align="center">
        {isEditMode ? "Edit Mitigation Knowledge Base" : "Create Mitigation Knowledge Base"}
      </RATypography>

      <Paper sx={sectionSx}>
        <RABox display="flex" flexDirection="column" gap={2}>
          <RATypography variant="h6">General</RATypography>
          <TextField
            label="Name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <RABox display="flex" gap={2} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  disabled={isPersistedDefault}
                  onChange={(event) => updateField("active", event.target.checked)}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.defaultKnowledgeBase}
                  disabled={isPersistedDefault || !form.active}
                  onChange={(event) =>
                    updateField("defaultKnowledgeBase", event.target.checked)
                  }
                />
              }
              label="Default"
            />
          </RABox>
        </RABox>
      </Paper>

      <RABox display="flex" justifyContent="center" gap={2}>
        <RAButton variant="outlined" color="secondary" onClick={() => navigate(LIST_ROUTE)}>
          Back
        </RAButton>
        <RAButton type="submit" variant="contained" color="primary" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </RAButton>
      </RABox>

      {isEditMode && (
        <Paper sx={sectionSx}>
          <RABox display="flex" flexDirection="column" gap={2}>
            <RATypography variant="h6">Actions</RATypography>
            <DataTable
              table={{ columns, rows }}
              canSearch
              canAdd
              searchColumnKey="displayName"
              searchPlaceholder="Search mitigation actions..."
              onAddClick={() =>
                navigate(
                  `/configuration/mitigation-knowledge-bases/${knowledgeBaseId}/actions/new`
                )
              }
            />
          </RABox>
        </Paper>
      )}

      <RAFloatingAlertStack
        alerts={[
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
