import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  archiveProjectTemplateApi,
  duplicateProjectTemplateApi,
  fetchProjectTemplatesApi,
  setDefaultProjectTemplateApi,
} from "api/projectTemplates";

export default function useProjectTemplateConfiguration(token) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await fetchProjectTemplatesApi(token);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMsg(
        error.message || t("projectTemplateConfiguration.alerts.loadTemplatesFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const duplicateTemplate = useCallback(
    async (template) => {
      if (!token) return;
      try {
        await duplicateProjectTemplateApi(template.id, token);
        await loadTemplates();
      } catch (error) {
        setErrorMsg(
          error.message || t("projectTemplateConfiguration.alerts.duplicateTemplateFailed")
        );
      }
    },
    [loadTemplates, t, token]
  );

  const setDefaultTemplate = useCallback(
    async (template) => {
      if (!token) return;
      try {
        await setDefaultProjectTemplateApi(template.id, token);
        await loadTemplates();
      } catch (error) {
        setErrorMsg(
          error.message || t("projectTemplateConfiguration.alerts.setDefaultTemplateFailed")
        );
      }
    },
    [loadTemplates, t, token]
  );

  const archiveTemplate = useCallback(
    async (template) => {
      if (!token) return;
      try {
        await archiveProjectTemplateApi(template.id, token);
        await loadTemplates();
      } catch (error) {
        setErrorMsg(
          error.message || t("projectTemplateConfiguration.alerts.archiveTemplateFailed")
        );
      }
    },
    [loadTemplates, t, token]
  );

  return {
    templates,
    loading,
    errorMsg,
    setErrorMsg,
    loadTemplates,
    duplicateTemplate,
    setDefaultTemplate,
    archiveTemplate,
  };
}
