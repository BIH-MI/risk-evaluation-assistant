import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

import DataTable from "components/display/Tables/DataTable";
import RAAlert from "components/feedback/RAAlert";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";
import { fetchMitigationActionsApi } from "api/mitigationActions";

import getMitigationActionsTableData from "./getMitigationActionsTableData";

export default function MitigationCatalogue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadActions = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchMitigationActionsApi(token);
      setActions(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMsg(error.message || "Failed to load mitigation actions.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

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
        navigate(`/configuration/mitigation-catalogue/${action.id}/edit`)
      ),
    [navigate, sortedActions]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            Only administrators can manage the mitigation catalogue.
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 64 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd
          searchColumnKey="displayName"
          searchPlaceholder="mitigation actions..."
          onAddClick={() => navigate("/configuration/mitigation-catalogue/new")}
        />
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message: loading ? "Loading mitigation actions..." : "",
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
