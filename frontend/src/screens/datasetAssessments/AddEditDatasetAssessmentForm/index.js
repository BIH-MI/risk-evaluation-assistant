import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "react-oidc-context";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAButton from "components/input/RAButton";
import RAFloatingAlertStack from "components/feedback/RAFloatingAlertStack";
import { LEGACY_ATTRIBUTE_SCORING_SYSTEM } from "utils/AttributeScale";
import { fetchAttributeScoringSystemsApi } from "api/attributeScoringSystems";
import AssessmentSetupSection from "./components/AssessmentSetupSection";
import QuestionnaireSection from "./components/QuestionnaireSection";
import AttributeRiskAssessmentSection from "./components/AttributeRiskAssessmentSection";
import { findPreviousAssessmentsForDataset } from "./evidence/previousAssessmentEvidence";
import { buildAssessmentTables } from "./utils/buildAssessmentTables";
import { buildAssessmentPayload } from "./utils/buildAssessmentPayload";

import {
  addDatasetAssessment,
  fetchDatasetAssessments,
  updateDatasetAssessment,
} from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import {
  fetchConfigurations,
  fetchConfiguration,
} from "store/configurations/configurationThunks";
import { useActiveLock } from "hooks/locks/useActiveLock";
import { getErrorMessage } from "utils/errors";

const EMPTY_ARRAY = [];

export default function AddEditDatasetAssessmentForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Extract i18n to dynamically determine the current active language
  const { t, i18n } = useTranslation();
  const token = user?.access_token;

  const currentLang = i18n.language?.split("-")[0] || "en";

  const { datasetId: dsParam, assessmentId: asmtParam } = useParams();
  const datasetId = Number(dsParam);
  const assessmentId = asmtParam ? Number(asmtParam) : null;
  const isEditMode = Boolean(assessmentId);

  // --- REDUX SELECTORS ---
  const { items: datasets } = useSelector((state) => state.datasets);
  const { items: configurations, loading: configLoading } = useSelector(
    (state) => state.configurations
  );
  const { items: assessments } = useSelector(
    (state) => state.datasetAssessments
  );

  // --- FORM STATE ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasetId || "");
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [selectedScoringSystemId, setSelectedScoringSystemId] = useState("");
  const [scoringSystems, setScoringSystems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [tables, setTables] = useState([]);

  const [activeQuestTab, setActiveQuestTab] = useState(0);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initializedAssessmentIdRef = useRef(null);
  const hasCustomNameRef = useRef(false);
  const generatedNameRef = useRef({ datasetId: null, name: "" });
  const lockRedirectTimerRef = useRef(null);

  // Memos for easy lookup
  const dataset = useMemo(
    () => datasets.find((d) => d.id === selectedDatasetId),
    [datasets, selectedDatasetId]
  );
  const assessment = useMemo(
    () => assessments.find((a) => a.id === assessmentId),
    [assessments, assessmentId]
  );

  const activeConfig = useMemo(() => {
    if (isEditMode && assessment?.configuration) {
      return assessment.configuration;
    }

    return configurations.find(
      (c) => String(c.id) === String(selectedConfigId)
    );
  }, [assessment, configurations, isEditMode, selectedConfigId]);

  const configurationOptions = useMemo(() => {
    const map = new Map();
    configurations
      .filter((config) => isEditMode || config.isActive)
      .forEach((config) => map.set(String(config.id), config));
    if (activeConfig?.id != null) {
      map.set(String(activeConfig.id), activeConfig);
    }
    return Array.from(map.values());
  }, [activeConfig, configurations, isEditMode]);

  const selectedScoringSystem = useMemo(() => {
    if (isEditMode && assessment?.attributeScoringSystem) {
      return assessment.attributeScoringSystem;
    }
    return (
      scoringSystems.find(
        (system) => String(system.id) === String(selectedScoringSystemId)
      ) ||
      scoringSystems.find((system) => system.defaultSystem) ||
      LEGACY_ATTRIBUTE_SCORING_SYSTEM
    );
  }, [assessment, isEditMode, scoringSystems, selectedScoringSystemId]);

  const scoringSystemOptions = useMemo(() => {
    const map = new Map();
    scoringSystems.forEach((system) => map.set(String(system.id), system));
    if (selectedScoringSystem?.id != null) {
      map.set(String(selectedScoringSystem.id), selectedScoringSystem);
    }
    return Array.from(map.values());
  }, [scoringSystems, selectedScoringSystem]);

  useEffect(() => {
    if (isEditMode || selectedConfigId || configurationOptions.length === 0) {
      return;
    }

    const defaultConfig =
      configurationOptions.find((config) => config.isDefault) ||
      configurationOptions[0];
    setSelectedConfigId(defaultConfig?.id || "");
  }, [configurationOptions, isEditMode, selectedConfigId]);

  useEffect(() => {
    if (
      isEditMode ||
      selectedScoringSystemId ||
      scoringSystemOptions.length === 0
    ) {
      return;
    }

    const defaultSystem =
      scoringSystemOptions.find(
        (system) =>
          system.active !== false && (system.defaultSystem || system.isDefault)
      ) || scoringSystemOptions[0];
    setSelectedScoringSystemId(defaultSystem?.id || "");
  }, [isEditMode, scoringSystemOptions, selectedScoringSystemId]);

  const categories = activeConfig?.categories || EMPTY_ARRAY;
  const questions = activeConfig?.questions || EMPTY_ARRAY;

  // Filter categories & questions specifically for DATASET_ASSESSMENT phase
  const datasetCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => c.assessmentPhase === "DATASET_ASSESSMENT");
  }, [categories]);

  const questionsByCategory = useMemo(() => {
    if (!questions || datasetCategories.length === 0) return {};
    const grouped = {};
    datasetCategories.forEach((cat) => {
      grouped[cat.code] = questions.filter((q) => q.categoryCode === cat.code);
    });
    return grouped;
  }, [questions, datasetCategories]);

  // Validate All Required Questions Are Answered
  const allAnswered = useMemo(() => {
    if (!questions || datasetCategories.length === 0) return false;

    const requiredQuestionIds = [];
    datasetCategories.forEach((cat) => {
      const catQs = questions.filter(
        (q) => q.categoryCode === cat.code && q.isRequired
      );
      requiredQuestionIds.push(...catQs.map((q) => q.id));
    });

    return requiredQuestionIds.every((id) => answers[id]?.answer);
  }, [answers, questions, datasetCategories]);

  const previousAssessments = useMemo(() => {
    return findPreviousAssessmentsForDataset({
      assessments,
      selectedDatasetId,
      assessmentId,
    });
  }, [assessments, selectedDatasetId, assessmentId]);

  // --- LOCKING ---
  const [lockError, setLockError] = useState(null);

  const onLockFailed = useCallback(
    (err) => {
      setLockError(t("datasetAssessments.alerts.lockFailed"));

      if (lockRedirectTimerRef.current) {
        clearTimeout(lockRedirectTimerRef.current);
      }

      /**
       * The redirect timer is cleaned up on unmount so navigation cannot fire
       * after the user has already left the form.
       */
      lockRedirectTimerRef.current = setTimeout(() => {
        navigate(`/datasets/${datasetId}/assessments`);
      }, 2000);
    },
    [navigate, datasetId, t]
  );

  useEffect(
    () => () => {
      if (lockRedirectTimerRef.current) {
        clearTimeout(lockRedirectTimerRef.current);
      }
    },
    []
  );

  const hasLock = useActiveLock(
    "DATASET_ASSESSMENT",
    isEditMode ? String(assessmentId) : null,
    onLockFailed
  );

  const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

  // --- INITIALIZATION ---
  useEffect(() => {
    if (token) {
      dispatch(fetchDatasets(token));
      dispatch(fetchDatasetAssessments(token));
      dispatch(fetchConfigurations(token));
      fetchAttributeScoringSystemsApi(token, { activeOnly: true })
        .then((data) => setScoringSystems(Array.isArray(data) ? data : []))
        .catch((err) =>
          setLockError(err.message || "Failed to load scoring systems.")
        );
    }
  }, [dispatch, token]);

  /**
   * Edit initialization is keyed by assessment ID, not form contents, so a
   * background Redux refresh (e.g. after saving) cannot silently overwrite
   * unsaved edits just because the user cleared the name field.
   */
  useEffect(() => {
    if (!isEditMode || !assessment) return;
    if (initializedAssessmentIdRef.current === assessment.id) return;

    setName(assessment.name || "");
    setDescription(assessment.description || "");
    setSelectedDatasetId(assessment.datasetId || "");
    setSelectedConfigId(assessment.configurationId || "");
    setSelectedScoringSystemId(assessment.attributeScoringSystemId || "");

    initializedAssessmentIdRef.current = assessment.id;
  }, [isEditMode, assessment]);

  /**
   * Suggest a name for a new assessment as the dataset selection changes,
   * but stop suggesting the moment the user types a name of their own.
   */
  useEffect(() => {
    if (isEditMode || !dataset || hasCustomNameRef.current) return;

    const datasetKey = String(dataset.id);
    if (generatedNameRef.current.datasetId === datasetKey) return;

    const nextIndex = (dataset.assessmentIds?.length || 0) + 1;
    const suggestedName = `${dataset.name} / Assessment ${nextIndex}`;

    generatedNameRef.current = { datasetId: datasetKey, name: suggestedName };
    setName(suggestedName);
  }, [isEditMode, dataset]);

  const handleNameChange = useCallback((value) => {
    hasCustomNameRef.current = value !== generatedNameRef.current.name;
    setName(value);
  }, []);

  useEffect(() => {
    if (!dataset) {
      setTables([]);
      return;
    }

    if (isEditMode && !assessment) return;

    setTables(
      buildAssessmentTables({
        dataset,
        assessment,
        isEditMode,
        scoringSystem: selectedScoringSystem,
      })
    );
  }, [dataset, isEditMode, assessment, selectedScoringSystem]);

  // Fetch deep configuration hierarchy when a config is selected
  useEffect(() => {
    if (
      selectedConfigId &&
      token &&
      !(isEditMode && assessment?.configuration)
    ) {
      dispatch(fetchConfiguration({ id: selectedConfigId, token }));
      setActiveQuestTab(0); // Reset tab when config changes
    }
  }, [assessment, dispatch, isEditMode, selectedConfigId, token]);

  // Pre-fill answers ONCE the questions have been fully fetched from the configuration
  // AND auto-select the first option for any question that is left unanswered.
  useEffect(() => {
    if (
      selectedConfigId &&
      questions?.length > 0 &&
      datasetCategories?.length > 0
    ) {
      setAnswers((prevAnswers) => {
        const nextAnswers = { ...prevAnswers };
        let isModified = false;

        // 1. If in Edit Mode and we haven't loaded the assessment answers yet
        if (isEditMode && assessment && Object.keys(prevAnswers).length === 0) {
          (assessment.answers || []).forEach((ans) => {
            const q = questions.find((quest) => quest.id === ans.questionId);

            let opt = null;
            if (ans.selectedOptionId) {
              opt = q?.options?.find(
                (o) => String(o.id) === String(ans.selectedOptionId)
              );
            }

            const rawValue = opt?.code || opt?.id || opt?.text;
            const valueToUse = rawValue != null ? String(rawValue) : "";
            const idToUse = ans.selectedOptionId || opt?.id || null;

            if (valueToUse) {
              nextAnswers[ans.questionId] = {
                id: ans.id,
                optionId: idToUse,
                code: opt?.code || null,
                text: opt?.text,
                answer: valueToUse,
              };
              isModified = true;
            }
          });
        }

        // 2. Auto-select the first option for any unanswered dataset assessment questions
        datasetCategories.forEach((cat) => {
          const catQuestions = questions.filter(
            (q) => q.categoryCode === cat.code
          );
          catQuestions.forEach((q) => {
            if (!nextAnswers[q.id] && q.options?.length > 0) {
              const firstOpt = q.options[0];
              const rawValue = firstOpt.code || firstOpt.id || firstOpt.text;
              if (rawValue != null) {
                nextAnswers[q.id] = {
                  id: null,
                  optionId: firstOpt.id || null,
                  code: firstOpt.code || null,
                  text: firstOpt.text,
                  answer: String(rawValue),
                };
                isModified = true;
              }
            }
          });
        });

        // Only trigger a state update if we actually modified the answers object
        return isModified ? nextAnswers : prevAnswers;
      });
    }
  }, [isEditMode, assessment, selectedConfigId, questions, datasetCategories]);

  // Handle Answer Change
  const handleAnswerChange = useCallback(
    (questionId, value) => {
      // NOTE: Uses original unlocalized questions from Redux so answering logic doesn't break
      const question = questions?.find((q) => q.id === questionId);

      const selectedOption = question?.options?.find(
        (o) =>
          String(o.code) === String(value) || String(o.id) === String(value)
      );

      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          optionId: selectedOption?.id || null,
          code: selectedOption?.code || null,
          text: selectedOption?.text || value,
          answer: String(value),
        },
      }));
    },
    [questions]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowAllErrors(true);

    if (!name.trim()) return;
    if (!isEditMode && !selectedScoringSystemId) return;
    setIsSubmitting(true);

    const assessmentPayload = buildAssessmentPayload({
      name,
      description,
      selectedDatasetId,
      selectedConfigId,
      selectedScoringSystemId,
      selectedScoringSystem,
      answers,
      tables,
    });

    try {
      if (isEditMode) {
        await dispatch(
          updateDatasetAssessment({
            datasetId: selectedDatasetId,
            assessmentId: assessmentId,
            updatedAssessment: assessmentPayload,
            token,
          })
        ).unwrap();
      } else {
        await dispatch(
          addDatasetAssessment({
            datasetId: selectedDatasetId,
            newAssessment: assessmentPayload,
            token,
          })
        ).unwrap();
      }
      navigate(`/datasets/${selectedDatasetId}/assessments`);
    } catch (err) {
      setLockError(
        getErrorMessage(err, t("datasetAssessments.alerts.saveFailed"))
      );
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <RABox
        component="form"
        onSubmit={handleSubmit}
        display="flex"
        flexDirection="column"
        maxWidth="1200px"
        width="100%"
        mx="auto"
        gap={3}
        p={3}
      >
        <RATypography variant="h4" fontWeight="bold" align="center">
          {isEditMode
            ? t("datasetAssessments.form.editTitle")
            : t("datasetAssessments.form.newTitle")}
        </RATypography>

        <AssessmentSetupSection
          datasets={datasets}
          configurationOptions={configurationOptions}
          scoringSystemOptions={scoringSystemOptions}
          selectedDatasetId={selectedDatasetId}
          setSelectedDatasetId={setSelectedDatasetId}
          selectedConfigId={selectedConfigId}
          setSelectedConfigId={setSelectedConfigId}
          selectedScoringSystemId={selectedScoringSystemId}
          setSelectedScoringSystemId={setSelectedScoringSystemId}
          name={name}
          setName={handleNameChange}
          description={description}
          setDescription={setDescription}
          isEditMode={isEditMode}
          isReadOnly={isReadOnly}
        />

        <QuestionnaireSection
          selectedConfigId={selectedConfigId}
          configLoading={configLoading}
          datasetCategories={datasetCategories}
          questionsByCategory={questionsByCategory}
          activeQuestTab={activeQuestTab}
          setActiveQuestTab={setActiveQuestTab}
          answers={answers}
          handleAnswerChange={handleAnswerChange}
          currentLang={currentLang}
          isReadOnly={isReadOnly}
          showAllErrors={showAllErrors}
        />

        <AttributeRiskAssessmentSection
          dataset={dataset}
          previousAssessments={previousAssessments}
          tables={tables}
          setTables={setTables}
          scoringSystem={selectedScoringSystem}
          isReadOnly={isReadOnly}
        />

        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          sx={{ alignSelf: "center", mt: 3, minWidth: 200 }}
          disabled={
            isReadOnly ||
            !name.trim() ||
            !selectedDatasetId ||
            !selectedConfigId ||
            (!isEditMode && !selectedScoringSystemId) ||
            !allAnswered
          }
        >
          {isEditMode
            ? t("datasetAssessments.form.updateButton")
            : t("datasetAssessments.form.createButton")}
        </RAButton>
      </RABox>

      <RAFloatingAlertStack
        alerts={[
          {
            id: "lockError",
            color: "error",
            message: lockError,
            onClose: () => setLockError(null),
          },
        ]}
      />
    </>
  );
}
