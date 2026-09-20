import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import { fetchProjectTemplatesApi } from "api/projectTemplates";
import { useUsersApi } from "api/users";
import { useActiveLock } from "hooks/locks/useActiveLock";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import {
  createProject,
  fetchProjectById,
  fetchProjects,
  updateProject,
} from "store/projects/projectsThunks";
import { getErrorMessage } from "utils/errors";

import {
  buildInitialResponses,
  buildProjectPayload,
  createEmptyProjectForm,
  getVisibleSections,
  hasProjectFormErrors,
  normalizeProject,
  validateProjectForm,
} from "./projectFormUtils";

export default function useProjectForm() {
  const { projectId: rawProjectId } = useParams();
  const projectId = rawProjectId ? Number(rawProjectId) : null;
  const isEdit = Boolean(projectId);

  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { fetchUsersByUsernames } = useUsersApi();

  const datasets = useSelector((state) => state.datasets.items || []);
  const recipients = useSelector((state) => state.recipients.items || []);
  const projects = useSelector((state) => state.projects.items || []);
  const projectStatus = useSelector((state) => state.projects.status);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === projectId) || null,
    [projectId, projects]
  );

  const [values, setValues] = useState(createEmptyProjectForm());
  const [sharedUsers, setSharedUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lockError, setLockError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const initializedTargetRef = useRef(null);
  const lockRedirectTimerRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    dispatch(fetchDatasets(token));
    dispatch(fetchRecipients(token));
    dispatch(fetchProjects(token));
  }, [dispatch, token]);

  useEffect(() => {
    if (!token || !isEdit || currentProject) return;
    dispatch(fetchProjectById({ id: projectId, token }));
  }, [currentProject, dispatch, isEdit, projectId, token]);

  // Only published, active templates may be selected for a new Project. The
  // list endpoint already returns each template's sections/requirements, so
  // no extra fetch is needed once a template is chosen.
  useEffect(() => {
    if (!token || isEdit) return;
    let active = true;
    setTemplatesLoading(true);
    fetchProjectTemplatesApi(token, { activeOnly: true })
      .then((data) => {
        if (!active) return;
        const nextTemplates = Array.isArray(data) ? data : [];
        setTemplates(nextTemplates);
        setValues((previous) => {
          if (previous.templateVersionId || nextTemplates.length === 0) {
            return previous;
          }
          const defaultTemplate =
            nextTemplates.find((template) => template.defaultTemplate) || nextTemplates[0];
          return {
            ...previous,
            templateVersionId: defaultTemplate.versionId,
            responses: buildInitialResponses(defaultTemplate.sections || []),
          };
        });
      })
      .catch(() => {
        if (active) setTemplates([]);
      })
      .finally(() => {
        if (active) setTemplatesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEdit, token]);

  useEffect(() => {
    const targetKey = isEdit ? `project:${projectId}` : "project:new";
    if (initializedTargetRef.current === targetKey) return;
    if (isEdit && !currentProject) return;

    setValues(isEdit ? normalizeProject(currentProject) : createEmptyProjectForm());
    initializedTargetRef.current = targetKey;
  }, [currentProject, isEdit, projectId]);

  useEffect(() => {
    let active = true;
    const usernames = values.sharedUsernames || [];

    if (usernames.length === 0) {
      setSharedUsers([]);
      return undefined;
    }

    fetchUsersByUsernames(usernames)
      .then((users) => {
        if (active) setSharedUsers(users);
      })
      .catch(() => {
        if (active) setSharedUsers([]);
      });

    return () => {
      active = false;
    };
  }, [fetchUsersByUsernames, values.sharedUsernames]);

  const onLockFailed = useCallback(() => {
    setLockError(t("projects.alerts.lockFailed"));
    if (lockRedirectTimerRef.current) {
      clearTimeout(lockRedirectTimerRef.current);
    }
    lockRedirectTimerRef.current = setTimeout(() => {
      navigate("/projects");
    }, 2000);
  }, [navigate, t]);

  const hasLock = useActiveLock("PROJECT", isEdit ? String(projectId) : null, onLockFailed);
  const isReadOnly = (isEdit && !hasLock) || isSubmitting;

  useEffect(
    () => () => {
      if (lockRedirectTimerRef.current) {
        clearTimeout(lockRedirectTimerRef.current);
      }
    },
    []
  );

  // The template sections to render: the project's immutable pinned
  // template snapshot when editing, or the selected template's sections
  // (already included in the templates list) when creating.
  const templateSections = useMemo(() => {
    if (isEdit) {
      return currentProject?.projectTemplate?.sections || [];
    }
    const selected = templates.find(
      (template) => template.versionId === values.templateVersionId
    );
    return selected?.sections || [];
  }, [currentProject, isEdit, templates, values.templateVersionId]);

  // Conditional sections are only
  // rendered, validated, and submitted while their display condition is
  // currently satisfied by the draft responses.
  const visibleTemplateSections = useMemo(
    () => getVisibleSections(templateSections, values.responses),
    [templateSections, values.responses]
  );

  const selectedDatasets = useMemo(
    () =>
      datasets.filter((dataset) =>
        values.datasetIds.map(String).includes(String(dataset.id))
      ),
    [datasets, values.datasetIds]
  );

  const selectedRecipients = useMemo(
    () =>
      recipients.filter((recipient) =>
        values.recipientIds.map(String).includes(String(recipient.id))
      ),
    [recipients, values.recipientIds]
  );

  const validationErrors = useMemo(
    () => validateProjectForm(values, visibleTemplateSections, t),
    [t, visibleTemplateSections, values]
  );
  const hasErrors = hasProjectFormErrors(validationErrors);

  const handleFieldChange = useCallback((field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleTemplateChange = useCallback((templateVersionId) => {
    const selectedTemplate = templates.find(
      (template) => template.versionId === templateVersionId
    );

    setValues((previous) => ({
      ...previous,
      templateVersionId,
      responses: buildInitialResponses(selectedTemplate?.sections || []),
    }));
  }, [templates]);

  const handleResponseChange = useCallback((requirementId, changes) => {
    setValues((previous) => ({
      ...previous,
      responses: {
        ...previous.responses,
        [requirementId]: { ...previous.responses[requirementId], ...changes },
      },
    }));
  }, []);

  const handleSharedUsersChange = useCallback((_event, users) => {
    const nextUsers = Array.isArray(users) ? users : [];
    setSharedUsers(nextUsers);
    setValues((previous) => ({
      ...previous,
      sharedUsernames: nextUsers.map((sharedUser) => sharedUser.username),
    }));
  }, []);

  const handleDatasetsChange = useCallback((_event, nextDatasets) => {
    setValues((previous) => ({
      ...previous,
      datasetIds: nextDatasets.map((dataset) => dataset.id),
    }));
  }, []);

  const handleRecipientsChange = useCallback((_event, nextRecipients) => {
    setValues((previous) => ({
      ...previous,
      recipientIds: nextRecipients.map((recipient) => recipient.id),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isEdit && !hasLock) {
        setLockError(t("projects.alerts.lockLost"));
        return;
      }

      setShowErrors(true);
      if (hasErrors || isSubmitting) return;

      setIsSubmitting(true);
      setSubmitError("");

      try {
        const payload = buildProjectPayload(values, visibleTemplateSections);
        if (isEdit) {
          await dispatch(
            updateProject({ id: projectId, updatedProject: payload, token })
          ).unwrap();
        } else {
          await dispatch(createProject({ newProject: payload, token })).unwrap();
        }

        navigate("/projects");
      } catch (error) {
        setSubmitError(getErrorMessage(error, t("projects.form.submitFailed")));
        setIsSubmitting(false);
      }
    },
    [
      dispatch,
      hasErrors,
      hasLock,
      isEdit,
      isSubmitting,
      navigate,
      projectId,
      t,
      visibleTemplateSections,
      token,
      values,
    ]
  );

  return {
    isEdit,
    values,
    sharedUsers,
    templates,
    templatesLoading,
    templateSections: visibleTemplateSections,
    datasets,
    recipients,
    selectedDatasets,
    selectedRecipients,
    projectStatus,
    currentProject,
    submitError,
    setSubmitError,
    lockError,
    setLockError,
    isSubmitting,
    isReadOnly,
    showErrors,
    validationErrors,
    handleFieldChange,
    handleTemplateChange,
    handleResponseChange,
    handleSharedUsersChange,
    handleDatasetsChange,
    handleRecipientsChange,
    handleSubmit,
  };
}
