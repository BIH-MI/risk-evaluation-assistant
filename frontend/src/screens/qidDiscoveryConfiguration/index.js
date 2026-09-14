import React, { useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import DataTable from "components/display/Tables/DataTable";
import RAAlert from "components/feedback/RAAlert";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import RADialog from "components/feedback/RADialog";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { isAdminUser } from "utils/auth";

import getQidDiscoveryConfigurationTableData from "./getQidDiscoveryConfigurationTableData";
import useQidDiscoveryConfiguration from "./useQidDiscoveryConfiguration";

export default function QidDiscoveryConfiguration() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
        setArchiveTarget,
        t
      ),
    [
      duplicateConfiguration,
      navigate,
      setDefaultConfiguration,
      sortedConfigurations,
      t,
    ]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            {t("qidDiscoveryConfiguration.alerts.adminOnly")}
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
          searchPlaceholder={t(
            "qidDiscoveryConfiguration.list.searchPlaceholder"
          )}
          onAddClick={() => navigate("/configuration/qid-discovery/new")}
        />
      </RABox>

      <RADialog
        open={Boolean(archiveTarget)}
        title={t("qidDiscoveryConfiguration.dialog.archiveTitle")}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await archiveConfiguration(archiveTarget);
          setArchiveTarget(null);
        }}
        cancelText={t("qidDiscoveryConfiguration.dialog.cancel")}
        confirmText={t("qidDiscoveryConfiguration.dialog.archive")}
      >
        <RATypography variant="body2">
          {t("qidDiscoveryConfiguration.dialog.archiveWarning", {
            name: archiveTarget?.name,
          })}
        </RATypography>
      </RADialog>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "loading",
            color: "info",
            dismissible: false,
            message: loading ? t("qidDiscoveryConfiguration.list.loading") : "",
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
