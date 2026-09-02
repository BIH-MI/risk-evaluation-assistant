import React, { useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import DataTable from "components/display/Tables/DataTable";
import RAAlert from "components/feedback/RAAlert";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";

import getQidDiscoveryConfigurationTableData from "./getQidDiscoveryConfigurationTableData";
import useQidDiscoveryConfiguration from "./useQidDiscoveryConfiguration";

export default function QidDiscoveryConfiguration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const {
    configurations,
    loading,
    errorMsg,
    setErrorMsg,
    duplicateConfiguration,
    setDefaultConfiguration,
    archiveConfiguration,
  } = useQidDiscoveryConfiguration(isAdmin ? token : null);

  const sortedConfigurations = useMemo(() => {
    return [...configurations].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate || 0);
      const dateB = new Date(b.lastModifiedDate || b.creationDate || 0);
      return dateB - dateA;
    });
  }, [configurations]);

  const { columns, rows } = useMemo(
    () =>
      getQidDiscoveryConfigurationTableData(
        sortedConfigurations,
        (configuration) =>
          navigate(`/configuration/qid-discovery/${configuration.id}/edit`),
        duplicateConfiguration,
        setDefaultConfiguration,
        setArchiveTarget
      ),
    [
      duplicateConfiguration,
      navigate,
      setDefaultConfiguration,
      sortedConfigurations,
    ]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            Only administrators can manage QID discovery configurations.
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd
          searchColumnKey="displayName"
          searchPlaceholder="Search QID discovery configurations..."
          onAddClick={() => navigate("/configuration/qid-discovery/new")}
        />
      </RABox>

      <RADialog
        open={Boolean(archiveTarget)}
        title="Archive QID Discovery Configuration"
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await archiveConfiguration(archiveTarget);
          setArchiveTarget(null);
        }}
        cancelText="Cancel"
        confirmText="Archive"
      >
        <RATypography variant="body2">
          Archive {archiveTarget?.name}? Existing datasets will keep their saved
          QID discovery configuration version, but this configuration will no
          longer be selectable for new profiling sessions.
        </RATypography>
      </RADialog>

      <RABox
        sx={{
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          zIndex: theme.zIndex.snackbar,
          width: 380,
        }}
      >
        {loading && (
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              Loading QID discovery configurations...
            </RATypography>
          </RAAlert>
        )}
        {errorMsg && (
          <RAAlert color="error" dismissible onClose={() => setErrorMsg("")}>
            <RATypography variant="body2" color="white">
              {errorMsg}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    </RABox>
  );
}
