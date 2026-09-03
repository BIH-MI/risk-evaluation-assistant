import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { useActiveLock } from "hooks/locks/useActiveLock";
import {
  addRecipientAssessment,
  fetchRecipientAssessmentsByRecipientId,
  updateRecipientAssessment,
} from "store/recipientAssessments/recipientAssessmentsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import {
  fetchConfiguration,
  fetchConfigurations,
} from "store/configurations/configurationThunks";
import {
  applyDefaultQuestionAnswers,
  areRequiredQuestionsAnswered,
  buildConfigurationOptions,
  buildQuestionnaireValues,
  buildRecipientAssessmentPayload,
  buildAnswerState,
  buildSuggestedAssessmentName,
  createEmptyRecipientAssessmentForm,
  findSelectedQuestionOption,
  getDefaultConfiguration,
  getRecipientAssessmentQuestions,
  getRecipientAssessmentCategories,
  groupQuestionsByCategory,
  initializeFormFromAssessment,
  localizeQuestionsByCategory,
  restoreAssessmentAnswers,
} from "./recipientAssessmentFormUtils";

const EMPTY_ARRAY = Object.freeze([]);

function findById(items, id) {
  if (id == null || id === "") return null;
  return (items || []).find((item) => String(item.id) === String(id)) || null;
}

export default function useRecipientAssessmentForm() {
  const { recipientId: recipientIdParam, assessmentId: assessmentIdParam } =
    useParams();
  const routeRecipientId = recipientIdParam ? Number(recipientIdParam) : null;
  const assessmentId = assessmentIdParam ? Number(assessmentIdParam) : null;
  const isEditMode = Boolean(assessmentId);
  const routeAssessmentKey =
    isEditMode && routeRecipientId && assessmentId
      ? `${routeRecipientId}:${assessmentId}`
      : "";

  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.access_token;
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language?.split("-")[0] || "en";

  const recipients = useSelector(
    (state) => state.recipients.items || EMPTY_ARRAY
  );
  const {
    items: configurations = EMPTY_ARRAY,
    loading: isConfigurationLoading,
  } = useSelector((state) => state.configurations);
  const { items: assessments = EMPTY_ARRAY } = useSelector(
    (state) => state.recipientAssessments
  );

  const assessment = useMemo(
    () => findById(assessments, assessmentId),
    [assessments, assessmentId]
  );

  const [form, setForm] = useState(() => ({
    ...createEmptyRecipientAssessmentForm(),
    recipientId: routeRecipientId || "",
  }));

  /**
   * `answer` is the value consumed by questionnaire controls. optionId, code,
   * and text preserve backend identity/provenance for persisted answers.
   */
  const [answers, setAnswers] = useState({});
  const [activeCategoryCode, setActiveCategoryCode] = useState("");
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [routeAssessmentFetch, setRouteAssessmentFetch] = useState(() => ({
    key: routeAssessmentKey,
    status: isEditMode ? "loading" : "idle",
  }));
  const [loadedConfigurationsById, setLoadedConfigurationsById] = useState({});

  const initializedAssessmentIdRef = useRef(null);
  const restoredAnswersAssessmentIdRef = useRef(null);
  const generatedNameRef = useRef({ recipientId: null, name: "" });
  const hasCustomNameRef = useRef(false);
  const lockRedirectTimerRef = useRef(null);
  const requestedConfigurationIdsRef = useRef(new Set());

  const selectedRecipient = useMemo(
    () => findById(recipients, form.recipientId),
    [form.recipientId, recipients]
  );

  const activeConfiguration = useMemo(() => {
    if (isEditMode && assessment?.configuration) {
      return assessment.configuration;
    }

    return (
      loadedConfigurationsById[String(form.configurationId)] ||
      findById(configurations, form.configurationId)
    );
  }, [
    assessment,
    configurations,
    form.configurationId,
    isEditMode,
    loadedConfigurationsById,
  ]);

  const configurationOptions = useMemo(
    () =>
      buildConfigurationOptions({
        configurations,
        activeConfiguration,
        isEditMode,
      }),
    [activeConfiguration, configurations, isEditMode]
  );

  const categories = activeConfiguration?.categories || EMPTY_ARRAY;
  const allQuestions = activeConfiguration?.questions || EMPTY_ARRAY;

  const recipientCategories = useMemo(
    () => getRecipientAssessmentCategories(categories),
    [categories]
  );

  const recipientQuestions = useMemo(
    () => getRecipientAssessmentQuestions(allQuestions, recipientCategories),
    [allQuestions, recipientCategories]
  );

  const questionsByCategory = useMemo(
    () => groupQuestionsByCategory(recipientQuestions, recipientCategories),
    [recipientQuestions, recipientCategories]
  );

  const questionsById = useMemo(
    () =>
      new Map(
        recipientQuestions.map((question) => [String(question.id), question])
      ),
    [recipientQuestions]
  );

  const localizedQuestionsByCategory = useMemo(
    () => localizeQuestionsByCategory(questionsByCategory, currentLanguage),
    [currentLanguage, questionsByCategory]
  );

  const questionnaireValues = useMemo(
    () => buildQuestionnaireValues(answers),
    [answers]
  );

  const allRequiredQuestionsAnswered = useMemo(
    () =>
      areRequiredQuestionsAnswered({
        categories: recipientCategories,
        questionsByCategory,
        answers,
      }),
    [answers, questionsByCategory, recipientCategories]
  );

  const updateFormField = useCallback((field, value) => {
    setForm((previousForm) => {
      if (previousForm[field] === value) return previousForm;
      return { ...previousForm, [field]: value };
    });
  }, []);

  const loadConfiguration = useCallback(
    (configurationId) => {
      if (!token || !configurationId) return;

      const configurationKey = String(configurationId);
      if (requestedConfigurationIdsRef.current.has(configurationKey)) return;

      requestedConfigurationIdsRef.current.add(configurationKey);
      dispatch(fetchConfiguration({ id: configurationId, token }))
        .unwrap()
        .then((configuration) => {
          if (!configuration?.id) return;

          setLoadedConfigurationsById((previousConfigurations) => ({
            ...previousConfigurations,
            [String(configuration.id)]: configuration,
          }));
        })
        .catch((error) => {
          requestedConfigurationIdsRef.current.delete(configurationKey);
          setErrorMessage(
            error?.message || error || t("recipientAssessments.list.error")
          );
        });
    },
    [dispatch, t, token]
  );

  const handleFieldChange = useCallback(
    (field, value) => {
      const nextValue = value ?? "";

      if (field === "name") {
        hasCustomNameRef.current = nextValue !== generatedNameRef.current.name;
      }

      updateFormField(field, nextValue);
    },
    [updateFormField]
  );

  const handleRecipientChange = useCallback((recipientId) => {
    setForm((previousForm) => {
      const currentNameWasAutomatic =
        previousForm.name === generatedNameRef.current.name;
      const canGenerateNameForRecipient =
        !previousForm.name || currentNameWasAutomatic;

      hasCustomNameRef.current = !canGenerateNameForRecipient;

      if (canGenerateNameForRecipient) {
        generatedNameRef.current = { recipientId: null, name: "" };
      }

      return { ...previousForm, recipientId };
    });
  }, []);

  const handleConfigurationChange = useCallback(
    (configurationId) => {
      /**
       * Changing configuration invalidates answers because question IDs belong
       * to a particular configuration version.
       */
      updateFormField("configurationId", configurationId);
      setActiveCategoryCode("");
      setAnswers({});
      restoredAnswersAssessmentIdRef.current = null;

      if (configurationId) {
        loadConfiguration(configurationId);
      }
    },
    [loadConfiguration, updateFormField]
  );

  const handleAnswerChange = useCallback(
    (questionId, value) => {
      const question = questionsById.get(String(questionId));
      const selectedOption = findSelectedQuestionOption(question, value);

      setAnswers((previousAnswers) => ({
        ...previousAnswers,
        [questionId]: buildAnswerState(selectedOption, value),
      }));
    },
    [questionsById]
  );

  const onLockFailed = useCallback(() => {
    setErrorMessage(t("recipientAssessments.alerts.lockFailed"));

    if (lockRedirectTimerRef.current) {
      clearTimeout(lockRedirectTimerRef.current);
    }

    lockRedirectTimerRef.current = setTimeout(() => {
      navigate(`/recipients/${routeRecipientId}/assessments`);
    }, 2000);
  }, [navigate, routeRecipientId, t]);

  const hasLock = useActiveLock(
    "RECIPIENT_ASSESSMENT",
    isEditMode ? String(assessmentId) : null,
    onLockFailed
  );

  const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

  useEffect(
    () => () => {
      if (lockRedirectTimerRef.current) {
        clearTimeout(lockRedirectTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    dispatch(fetchRecipients(token));
    dispatch(fetchConfigurations(token));
  }, [dispatch, token]);

  useEffect(() => {
    if (!isEditMode) {
      setRouteAssessmentFetch({ key: "", status: "idle" });
      return;
    }

    if (!token || !routeRecipientId) {
      setRouteAssessmentFetch({ key: routeAssessmentKey, status: "idle" });
      return;
    }

    let active = true;

    setRouteAssessmentFetch({ key: routeAssessmentKey, status: "loading" });
    dispatch(
      fetchRecipientAssessmentsByRecipientId({
        recipientId: routeRecipientId,
        token,
      })
    )
      .unwrap()
      .then(() => {
        if (active) {
          setRouteAssessmentFetch({
            key: routeAssessmentKey,
            status: "succeeded",
          });
        }
      })
      .catch((error) => {
        if (!active) return;

        setRouteAssessmentFetch({ key: routeAssessmentKey, status: "failed" });
        setErrorMessage(
          error?.message || error || t("recipientAssessments.list.error")
        );
      });

    return () => {
      active = false;
    };
  }, [dispatch, isEditMode, routeAssessmentKey, routeRecipientId, t, token]);

  useEffect(() => {
    if (
      isEditMode ||
      form.configurationId ||
      configurationOptions.length === 0
    ) {
      return;
    }

    const defaultConfiguration = getDefaultConfiguration(configurationOptions);
    if (defaultConfiguration?.id != null) {
      handleConfigurationChange(defaultConfiguration.id);
    }
  }, [
    configurationOptions,
    form.configurationId,
    handleConfigurationChange,
    isEditMode,
  ]);

  useEffect(() => {
    if (isEditMode || !selectedRecipient || hasCustomNameRef.current) return;

    const recipientKey = String(selectedRecipient.id);
    if (generatedNameRef.current.recipientId === recipientKey) return;

    const suggestedName = buildSuggestedAssessmentName(selectedRecipient);
    if (!suggestedName) return;

    setForm((previousForm) => {
      if (String(previousForm.recipientId) !== recipientKey) {
        return previousForm;
      }

      if (hasCustomNameRef.current) return previousForm;

      generatedNameRef.current = {
        recipientId: recipientKey,
        name: suggestedName,
      };

      return { ...previousForm, name: suggestedName };
    });
  }, [isEditMode, selectedRecipient]);

  useEffect(() => {
    if (!isEditMode || !assessment) return;

    /**
     * Edit initialization is keyed by assessment ID rather than form contents.
     * Users must be able to clear/edit fields without triggering rehydration
     * from the persisted assessment.
     */
    if (initializedAssessmentIdRef.current === assessment.id) return;

    setForm(initializeFormFromAssessment(assessment));
    setAnswers({});
    setActiveCategoryCode("");
    initializedAssessmentIdRef.current = assessment.id;
    restoredAnswersAssessmentIdRef.current = null;
    hasCustomNameRef.current = true;
    generatedNameRef.current = { recipientId: null, name: "" };
  }, [assessment, isEditMode]);

  useEffect(() => {
    if (!form.configurationId || (isEditMode && assessment?.configuration)) {
      return;
    }

    loadConfiguration(form.configurationId);
  }, [assessment, form.configurationId, isEditMode, loadConfiguration]);

  useEffect(() => {
    const firstCategoryCode = recipientCategories[0]?.code || "";

    setActiveCategoryCode((previousCategoryCode) => {
      if (!firstCategoryCode) return "";

      const previousCategoryStillExists = recipientCategories.some(
        (category) => category.code === previousCategoryCode
      );

      return previousCategoryStillExists
        ? previousCategoryCode
        : firstCategoryCode;
    });
  }, [recipientCategories]);

  useEffect(() => {
    if (
      !form.configurationId ||
      recipientCategories.length === 0 ||
      recipientQuestions.length === 0
    ) {
      return;
    }

    if (isEditMode) {
      if (!assessment) return;

      if (restoredAnswersAssessmentIdRef.current !== assessment.id) {
        const restoredAnswers = restoreAssessmentAnswers({
          persistedAnswers: assessment.answers,
          questions: recipientQuestions,
        });

        setAnswers(
          applyDefaultQuestionAnswers({
            answers: restoredAnswers,
            questions: recipientQuestions,
          })
        );
        restoredAnswersAssessmentIdRef.current = assessment.id;
        return;
      }
    }

    setAnswers((previousAnswers) =>
      applyDefaultQuestionAnswers({
        answers: previousAnswers,
        questions: recipientQuestions,
      })
    );
  }, [
    assessment,
    form.configurationId,
    isEditMode,
    recipientCategories.length,
    recipientQuestions,
  ]);

  const isSubmitDisabled =
    isReadOnly ||
    !token ||
    !form.name.trim() ||
    !form.recipientId ||
    !form.configurationId ||
    !allRequiredQuestionsAnswered;

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setShowAllErrors(true);

      if (isSubmitting) return;
      if (!token) return;
      if (!form.name.trim()) return;
      if (!form.recipientId) return;
      if (!form.configurationId) return;
      if (!allRequiredQuestionsAnswered) return;
      if (isEditMode && !assessmentId) return;
      if (isEditMode && !assessment) return;
      if (isEditMode && !hasLock) {
        setErrorMessage(t("recipientAssessments.alerts.lockFailed"));
        return;
      }

      setIsSubmitting(true);

      try {
        const assessmentPayload = buildRecipientAssessmentPayload({
          form,
          answers,
        });

        if (isEditMode) {
          await dispatch(
            updateRecipientAssessment({
              recipientId: form.recipientId,
              assessmentId,
              updatedAssessment: assessmentPayload,
              token,
            })
          ).unwrap();
        } else {
          await dispatch(
            addRecipientAssessment({
              recipientId: form.recipientId,
              newAssessment: assessmentPayload,
              token,
            })
          ).unwrap();
        }

        navigate(`/recipients/${form.recipientId}/assessments`);
      } catch (error) {
        setErrorMessage(
          error.message || t("recipientAssessments.alerts.saveFailed")
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      allRequiredQuestionsAnswered,
      answers,
      assessment,
      assessmentId,
      dispatch,
      form,
      hasLock,
      isEditMode,
      isSubmitting,
      navigate,
      t,
      token,
    ]
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    isEditMode,
    isReadOnly,
    isSubmitting,
    isConfigurationLoading,
    isAssessmentLoading:
      isEditMode &&
      !assessment &&
      (routeAssessmentFetch.key !== routeAssessmentKey ||
        routeAssessmentFetch.status === "loading"),
    isSubmitDisabled,

    form,
    recipients,
    configurationOptions,

    recipientCategories,
    questionsByCategory,
    localizedQuestionsByCategory,
    questionnaireValues,

    activeCategoryCode,
    setActiveCategoryCode,

    allRequiredQuestionsAnswered,
    showAllErrors,

    handleFieldChange,
    handleRecipientChange,
    handleConfigurationChange,
    handleAnswerChange,
    handleSubmit,

    errorMessage,
    clearError,
  };
}
