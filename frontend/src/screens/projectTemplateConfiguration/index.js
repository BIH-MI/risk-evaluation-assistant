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

import getProjectTemplateConfigurationTableData from "./getProjectTemplateConfigurationTableData";
import useProjectTemplateConfiguration from "./useProjectTemplateConfiguration";

export default function ProjectTemplateConfiguration() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const {
    templates,
    loading,
    errorMsg,
    setErrorMsg,
    duplicateTemplate,
    setDefaultTemplate,
    archiveTemplate,
  } = useProjectTemplateConfiguration(isAdmin ? token : null);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate || 0);
      const dateB = new Date(b.lastModifiedDate || b.creationDate || 0);
      return dateB - dateA;
    });
  }, [templates]);

  const { columns, rows } = useMemo(
    () =>
      getProjectTemplateConfigurationTableData(
        sortedTemplates,
        (template) => navigate(`/configuration/project-templates/${template.id}/edit`),
        duplicateTemplate,
        setDefaultTemplate,
        setArchiveTarget,
        t
      ),
    [duplicateTemplate, navigate, setDefaultTemplate, sortedTemplates, t]
  );

  if (!isAdmin) {
    return (
      <RABox p={3}>
        <RAAlert color="warning">
          <RATypography variant="body2" color="white">
            {t("projectTemplateConfiguration.alerts.adminOnly")}
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
          searchPlaceholder={t("projectTemplateConfiguration.list.searchPlaceholder")}
          onAddClick={() => navigate("/configuration/project-templates/new")}
        />
      </RABox>

      <RADialog
        open={Boolean(archiveTarget)}
        title={t("projectTemplateConfiguration.dialog.archiveTitle")}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await archiveTemplate(archiveTarget);
          setArchiveTarget(null);
        }}
        cancelText={t("projectTemplateConfiguration.dialog.cancel")}
        confirmText={t("projectTemplateConfiguration.dialog.archive")}
      >
        <RATypography variant="body2">
          {t("projectTemplateConfiguration.dialog.archiveWarning", {
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
            message: loading ? t("projectTemplateConfiguration.list.loading") : "",
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
