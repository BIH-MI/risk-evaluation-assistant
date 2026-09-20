import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import {
  createProjectTemplateApi,
  fetchProjectTemplateApi,
  fetchProjectTemplatesApi,
  updateProjectTemplateApi,
} from "api/projectTemplates";
import { isAdminUser } from "utils/auth";

import {
  buildProjectTemplatePayload,
  createEmptyProjectTemplateForm,
  createEmptyRequirementEntry,
  createEmptySectionEntry,
  hasProjectTemplateFormErrors,
  normalizeProjectTemplateToForm,
  validateProjectTemplateForm,
} from "./projectTemplateFormUtils";

const LIST_ROUTE = "/configuration/project-templates";

export default function useProjectTemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language?.split("-")[0] || "en";
  const { user } = useAuth();
  const token = user?.access_token;
  const isAdmin = isAdminUser(user);
  const isEditMode = Boolean(id);

  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(() => createEmptyProjectTemplateForm());
  const [showErrors, setShowErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadEditorData = useCallback(
    async ({ isCurrent = () => true } = {}) => {
      if (!token || !isAdmin) return;

      setLoading(true);
      setErrorMessage("");

      try {
        const [templatesData, template] = await Promise.all([
          fetchProjectTemplatesApi(token),
          isEditMode ? fetchProjectTemplateApi(id, token) : null,
        ]);

        if (!isCurrent()) return;

        setTemplates(Array.isArray(templatesData) ? templatesData : []);
        setForm(
          template
            ? normalizeProjectTemplateToForm(template)
            : createEmptyProjectTemplateForm()
        );
        setShowErrors(false);
      } catch (error) {
        if (isCurrent()) {
          setErrorMessage(error.message || "Failed to load Project Template.");
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    },
    [id, isAdmin, isEditMode, token]
  );

  useEffect(() => {
    if (!token || !isAdmin) return undefined;

    let isMounted = true;
    loadEditorData({ isCurrent: () => isMounted });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, loadEditorData, token]);

  // currentLanguage isn't read directly here, but validateProjectTemplateForm
  // translates its messages via the i18n singleton, so it must stay a
  // dependency to re-run validation (and refresh already-shown errors) on
  // language switch.
  const validationErrors = useMemo(
    () => validateProjectTemplateForm(form, templates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, templates, currentLanguage]
  );
  const hasErrors = hasProjectTemplateFormErrors(validationErrors);

  const updateField = useCallback((field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  }, []);

  const updateSection = useCallback((sectionClientId, changes) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.clientId === sectionClientId ? { ...section, ...changes } : section
      ),
    }));
  }, []);

  const addSection = useCallback(() => {
    setForm((previous) => ({
      ...previous,
      sections: [...previous.sections, createEmptySectionEntry()],
    }));
  }, []);

  const removeSection = useCallback((sectionClientId) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.filter(
        (section) => section.clientId !== sectionClientId
      ),
    }));
  }, []);

  const moveSection = useCallback((sectionClientId, direction) => {
    setForm((previous) => {
      const index = previous.sections.findIndex(
        (section) => section.clientId === sectionClientId
      );
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= previous.sections.length) {
        return previous;
      }

      const nextSections = [...previous.sections];
      const [moved] = nextSections.splice(index, 1);
      nextSections.splice(targetIndex, 0, moved);
      return { ...previous, sections: nextSections };
    });
  }, []);

  const updateRequirement = useCallback(
    (sectionClientId, requirementClientId, changes) => {
      setForm((previous) => ({
        ...previous,
        sections: previous.sections.map((section) =>
          section.clientId === sectionClientId
            ? {
                ...section,
                requirements: section.requirements.map((requirement) =>
                  requirement.clientId === requirementClientId
                    ? { ...requirement, ...changes }
                    : requirement
                ),
              }
            : section
        ),
      }));
    },
    []
  );

  const addRequirement = useCallback((sectionClientId) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.clientId === sectionClientId
          ? {
              ...section,
              requirements: [...section.requirements, createEmptyRequirementEntry()],
            }
          : section
      ),
    }));
  }, []);

  const removeRequirement = useCallback((sectionClientId, requirementClientId) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.clientId === sectionClientId
          ? {
              ...section,
              requirements: section.requirements.filter(
                (requirement) => requirement.clientId !== requirementClientId
              ),
            }
          : section
      ),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setShowErrors(true);
    if (hasErrors || !token || saving) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const payload = buildProjectTemplatePayload(form);
      if (isEditMode) {
        await updateProjectTemplateApi(id, payload, token);
      } else {
        await createProjectTemplateApi(payload, token);
      }
      navigate(LIST_ROUTE);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save Project Template.");
    } finally {
      setSaving(false);
    }
  }, [form, hasErrors, id, isEditMode, navigate, saving, token]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  /**
   * Prevent accidental submission while editing text fields. Explicit Save
   * remains the only submission action.
   */
  const handleFormKeyDown = useCallback((event) => {
    if (
      event.key === "Enter" &&
      event.target.tagName !== "TEXTAREA" &&
      event.target.tagName !== "BUTTON"
    ) {
      event.preventDefault();
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage("");
  }, []);

  return {
    isAdmin,
    isEditMode,
    form,
    loading,
    saving,
    errorMessage,
    validationErrors,
    showErrors,
    updateField,
    updateSection,
    addSection,
    removeSection,
    moveSection,
    updateRequirement,
    addRequirement,
    removeRequirement,
    handleSubmit,
    handleFormKeyDown,
    clearError,
  };
}
