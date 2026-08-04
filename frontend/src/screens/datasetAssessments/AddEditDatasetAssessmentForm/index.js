import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "react-oidc-context";
import { useTheme } from "@mui/material/styles";
import { MenuItem, CircularProgress, Box, Card } from "@mui/material";
import { useTranslation } from "react-i18next";
import DownloadIcon from "@mui/icons-material/Download";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAInput from "components/input/RAInput";
import RAButton from "components/input/RAButton";
import PaginatedQuestionnaire from "components/input/RAQuestionnaire/PaginatedQuestionnaire";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import DatasetTablesAssessment from "components/display/Tables/DataTable/CustomDataTableComponents/DatasetTablesAssessment";
import RAAlert from "components/feedback/RAAlert";
import {
  getDefaultAttributeScaleMetrics,
  normalizeAttributeScaleValue,
} from "utils/AttributeScale";

import {
  addDatasetAssessment,
  updateDatasetAssessment,
} from "store/datasetAssessments/datasetAssessmentsThunks";
import { fetchDatasets } from "store/datasets/datasetsThunks";
import {
  fetchConfigurations,
  fetchConfiguration,
} from "store/configurations/configurationThunks";
import { useActiveLock } from "hooks/locks/useActiveLock";

const EMPTY_ARRAY = [];

export default function AddEditDatasetAssessmentForm() {
  const theme = useTheme();
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
  const [answers, setAnswers] = useState({});
  const [tables, setTables] = useState([]);

  // Import specific states
  const [importAssessmentId, setImportAssessmentId] = useState("");

  const [activeQuestTab, setActiveQuestTab] = useState(0);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memos for easy lookup
  const dataset = useMemo(
    () => datasets.find((d) => d.id === selectedDatasetId),
    [datasets, selectedDatasetId]
  );
  const assessment = useMemo(
    () => assessments.find((a) => a.id === assessmentId),
    [assessments, assessmentId]
  );

  // Safely extract categories and questions directly from the fetched active configuration in the items array
  const activeConfig = useMemo(
    () => configurations.find((c) => c.id === selectedConfigId),
    [configurations, selectedConfigId]
  );

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

  // Find previous assessments for the currently selected dataset to allow importing attributes
  const previousAssessments = useMemo(() => {
    if (!selectedDatasetId) return [];
    return assessments.filter(
      (a) => a.datasetId === selectedDatasetId && a.id !== assessmentId
    );
  }, [assessments, selectedDatasetId, assessmentId]);

  // --- LOCKING ---
  const [lockError, setLockError] = useState(null);

  const onLockFailed = useCallback(
    (err) => {
      setLockError(t("datasetAssessments.alerts.lockFailed"));
      setTimeout(() => navigate(`/datasets/${datasetId}/assessments`), 2000);
    },
    [navigate, datasetId, t]
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
      dispatch(fetchConfigurations(token));
    }
  }, [dispatch, token]);

  // Load Existing Assessment Metadata (Runs once when assessment loads)
  useEffect(() => {
    if (isEditMode && assessment && !name) {
      setName(assessment.name || "");
      setDescription(assessment.description || "");
      setSelectedDatasetId(assessment.datasetId || "");
      setSelectedConfigId(assessment.configurationId || "");
    }
  }, [isEditMode, assessment, name]);

  // Automatically name the assessment in create mode when a dataset is selected
  useEffect(() => {
    if (!isEditMode && dataset && !name) {
      const nextIndex = (dataset.assessmentIds?.length || 0) + 1;
      setName(`${dataset.name} / Assessment ${nextIndex}`);
    }
  }, [isEditMode, dataset, name]);

  // Reset the import dropdown if the dataset changes
  useEffect(() => {
    setImportAssessmentId("");
  }, [selectedDatasetId]);

  // Initialize Attribute Tables based on the selected dataset schema
  useEffect(() => {
    if (!dataset) {
      setTables([]);
      return;
    }

    if (isEditMode) {
      if (!assessment) return; // Wait for assessment details

      // EDIT MODE: Merge the dataset schema with the saved assessment scores
      const taMap = new Map(
        (assessment.tableAssessments || []).map((ta) => [ta.tableId, ta])
      );
      setTables(
        (dataset.tables || []).map((tbl) => {
          const ta = taMap.get(tbl.id);
          const answered = new Map(
            (ta?.attributes || []).map((a) => [a.attributeId, a])
          );
          return {
            id: ta?.id ?? null,
            tableId: tbl.id,
            tableName: tbl.name,
            attributes: tbl.attributes.map((attr) => {
              const asmAttr = answered.get(attr.id);
              const excluded = attr.excluded;
              return {
                id: asmAttr?.id ?? null,
                name: attr.name,
                dataType: attr.dataType,
                attributeId: attr.id,
                sensitivity: excluded
                  ? null
                  : normalizeAttributeScaleValue(
                      asmAttr?.sensitivity,
                      "sensitivity",
                      { allowNull: false }
                    ),
                replicability: excluded
                  ? null
                  : normalizeAttributeScaleValue(
                      asmAttr?.replicability,
                      "replicability",
                      { allowNull: false }
                    ),
                availability: excluded
                  ? null
                  : normalizeAttributeScaleValue(
                      asmAttr?.availability,
                      "availability",
                      { allowNull: false }
                    ),
                distinguishability: excluded
                  ? null
                  : normalizeAttributeScaleValue(
                      asmAttr?.distinguishability,
                      "distinguishability",
                      { allowNull: false }
                    ),
                isDirectIdentifier: excluded
                  ? null
                  : Boolean(asmAttr?.isDirectIdentifier),
                isExcluded: excluded,
              };
            }),
          };
        })
      );
    } else {
      // CREATE MODE: Generate blank assessments for all dataset attributes
      setTables(
        (dataset.tables || []).map((tbl) => ({
          tableId: tbl.id,
          tableName: tbl.name,
          attributes: tbl.attributes.map((attr) => ({
            id: null,
            name: attr.name,
            dataType: attr.dataType,
            attributeId: attr.id,
            ...(attr.excluded
              ? {
                  sensitivity: null,
                  replicability: null,
                  availability: null,
                  distinguishability: null,
                }
              : getDefaultAttributeScaleMetrics()),
            isDirectIdentifier: attr.excluded ? null : false,
            isExcluded: attr.excluded,
          })),
        }))
      );
    }
  }, [dataset, isEditMode, assessment]);

  // Fetch deep configuration hierarchy when a config is selected
  useEffect(() => {
    if (selectedConfigId && token) {
      dispatch(fetchConfiguration({ id: selectedConfigId, token }));
      setActiveQuestTab(0); // Reset tab when config changes
    }
  }, [dispatch, selectedConfigId, token]);

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

  // Handle Importing Attributes from a previous assessment
  const handleImportAttributes = useCallback(() => {
    if (!importAssessmentId) return;

    const sourceAsmt = assessments.find((a) => a.id === importAssessmentId);
    if (!sourceAsmt || !sourceAsmt.tableAssessments) return;

    const sourceTablesMap = new Map(
      sourceAsmt.tableAssessments.map((ta) => [ta.tableId, ta])
    );

    setTables((prevTables) =>
      prevTables.map((tbl) => {
        const srcTable = sourceTablesMap.get(tbl.tableId);
        if (!srcTable) return tbl;

        const srcAttrMap = new Map(
          (srcTable.attributes || []).map((a) => [a.attributeId, a])
        );

        return {
          ...tbl,
          attributes: tbl.attributes.map((attr) => {
            const srcAttr = srcAttrMap.get(attr.attributeId);
            if (!srcAttr) return attr;

            return {
              ...attr,
              sensitivity: srcAttr.sensitivity,
              replicability: srcAttr.replicability,
              availability: srcAttr.availability,
              distinguishability: srcAttr.distinguishability,
              isDirectIdentifier: Boolean(srcAttr.isDirectIdentifier),
              isExcluded: Boolean(srcAttr.isExcluded),
            };
          }),
        };
      })
    );

    // Reset dropdown after successful import
    setImportAssessmentId("");
  }, [importAssessmentId, assessments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowAllErrors(true);

    if (!name.trim()) return;
    setIsSubmitting(true);

    const assessmentPayload = {
      name,
      description,
      datasetId: selectedDatasetId,
      configurationId: selectedConfigId,
      answers: Object.entries(answers).map(([qId, ansData]) => ({
        id: ansData.id || null,
        questionId: Number(qId),
        selectedOptionId: ansData.optionId,
        selectedOptionCode: ansData.code !== ansData.text ? ansData.code : null,
        text: ansData.text,
      })),
      tableAssessments: tables,
    };

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
      setLockError(err.message || t("datasetAssessments.alerts.saveFailed"));
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

        <RABox display="flex" flexDirection="column" gap={2}>
          <RAInput
            select
            label={t("datasetAssessments.form.datasetLabel")}
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            fullWidth
            required
            disabled={isReadOnly || isEditMode}
          >
            {datasets.map((ds) => (
              <MenuItem key={ds.id} value={ds.id}>
                {ds.name}
              </MenuItem>
            ))}
          </RAInput>
          <RAInput
            select
            label={t("datasetAssessments.form.configurationLabel")}
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            fullWidth
            required
            disabled={isReadOnly || isEditMode}
          >
            {configurations.map((cfg) => (
              <MenuItem key={cfg.id} value={cfg.id}>
                {cfg.name}
              </MenuItem>
            ))}
          </RAInput>
          <OnBlurRAInput
            label={t("datasetAssessments.form.assessmentNameLabel")}
            value={name}
            onCommit={setName}
            fullWidth
            required
            disabled={isReadOnly}
          />
          <OnBlurRAInput
            label={t("datasetAssessments.form.descriptionLabel")}
            value={description}
            onCommit={setDescription}
            fullWidth
            multiline
            minRows={3}
            disabled={isReadOnly}
          />
        </RABox>

        <Card
          sx={{
            border: "1px solid #e0e0e0",
            boxShadow: 1,
            borderRadius: 2,
            mb: 4,
          }}
        >
          {selectedConfigId ? (
            configLoading ? (
              <RABox
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={400}
              >
                <CircularProgress />
              </RABox>
            ) : datasetCategories.length > 0 ? (
              <>
                {datasetCategories.length > 1 && (
                  <RABox
                    bgcolor="#fafafa"
                    borderBottom={1}
                    borderColor="divider"
                    p={2}
                  >
                    <RATypography
                      variant="h5"
                      fontWeight="bold"
                      align="center"
                      mb={2}
                    >
                      {t("datasetAssessments.form.dataRiskCategories")}
                    </RATypography>

                    <Box
                      display="flex"
                      flexWrap="wrap"
                      justifyContent="center"
                      gap={1.5}
                    >
                      {datasetCategories.map((cat, globalIndex) => {
                        const isActive = activeQuestTab === globalIndex;
                        return (
                          <RAButton
                            key={cat.code}
                            variant={isActive ? "contained" : "outlined"}
                            color={isActive ? "primary" : "secondary"}
                            onClick={() => setActiveQuestTab(globalIndex)}
                            sx={{
                              width: { xs: "100%", sm: "auto" }, // Full width on mobile, auto on desktop
                              minWidth: { sm: "200px" }, // Uniform button sizes
                              height: "100%",
                              py: 1,
                              px: 2,
                              fontWeight: isActive ? "bold" : "normal",
                              textTransform: "none",
                              bgcolor: isActive ? "primary.main" : "white",
                              color: isActive ? "white" : "text.primary",
                              borderColor: isActive
                                ? "primary.main"
                                : "grey.300",
                              "&:hover": {
                                bgcolor: isActive ? "primary.dark" : "grey.100",
                              },
                              transition: "all 0.2s ease-in-out",
                            }}
                          >
                            {cat.name}
                          </RAButton>
                        );
                      })}
                    </Box>
                  </RABox>
                )}

                <RABox mt={3} px={3} pb={3}>
                  {datasetCategories.map((cat, index) => {
                    if (
                      datasetCategories.length > 1 &&
                      index !== activeQuestTab
                    )
                      return null;

                    const catQuestions = questionsByCategory[cat.code] || [];
                    if (catQuestions.length === 0)
                      return (
                        <RATypography
                          key={cat.code}
                          variant="body1"
                          align="center"
                          color="text"
                        >
                          {t("datasetAssessments.form.noQuestionsForCategory", {
                            name: cat.name,
                          })}
                        </RATypography>
                      );

                    // Map questions to localized text fields on the fly
                    const localizedCatQuestions = catQuestions.map((q) => ({
                      ...q,
                      text: q.textTranslations?.[currentLang] || q.text,
                      options: (q.options || []).map((opt) => ({
                        ...opt,
                        text: opt.textTranslations?.[currentLang] || opt.text,
                      })),
                    }));

                    return (
                      <RABox key={cat.code}>
                        <PaginatedQuestionnaire
                          title={t("datasetAssessments.form.questionnaireOf", {
                            name: cat.name,
                          })}
                          questions={localizedCatQuestions}
                          values={Object.fromEntries(
                            Object.entries(answers).map(([qid, { answer }]) => [
                              Number(qid),
                              answer,
                            ])
                          )}
                          onChange={handleAnswerChange}
                          disablePagination
                          showRowNumbers
                          sx={{ width: "100%" }}
                          isReadOnly={isReadOnly}
                          showAllErrors={showAllErrors}
                          hideSubmit={true}
                        />
                      </RABox>
                    );
                  })}
                </RABox>
              </>
            ) : (
              <RABox
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={400}
              >
                <RATypography variant="body1" align="center" color="text">
                  {t("datasetAssessments.form.noQuestionsForPhase")}
                </RATypography>
              </RABox>
            )
          ) : (
            <RABox
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={400}
            >
              <RATypography variant="body1" align="center" color="text">
                {t("datasetAssessments.form.selectConfigPrompt")}
              </RATypography>
            </RABox>
          )}
        </Card>

        <RABox>
          <RATypography variant="h6" align="center" mb={2}>
            {t("datasetAssessments.form.attributeRiskAssessment")}
          </RATypography>

          {previousAssessments.length > 0 && !isReadOnly && (
            <RABox
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={2}
              mb={3}
              flexWrap="wrap"
            >
              <RATypography variant="body2" color="secondary">
                {t(
                  "datasetAssessments.form.importAttributesDesc",
                  "You can prefill the attribute risk values by importing them from a previously completed assessment for this dataset."
                )}
              </RATypography>
              <RAInput
                select
                label={t(
                  "datasetAssessments.form.importAttributesLabel",
                  "Import attributes from previous assessment"
                )}
                value={importAssessmentId}
                onChange={(e) => setImportAssessmentId(e.target.value)}
                sx={{ minWidth: 210 }}
                size="small"
              >
                <MenuItem value="" disabled>
                  <em>
                    {t(
                      "datasetAssessments.form.selectAssessment",
                      "Select assessment..."
                    )}
                  </em>
                </MenuItem>
                {previousAssessments.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </RAInput>
              <RAButton
                variant="gradient"
                color="primary"
                onClick={handleImportAttributes}
                disabled={!importAssessmentId}
                sx={{ padding: "8px 16px", minWidth: 0 }}
              >
                <DownloadIcon />
              </RAButton>
            </RABox>
          )}

          <DatasetTablesAssessment
            tables={tables}
            setTables={setTables}
            isReadOnly={isReadOnly}
          />
        </RABox>

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
            !allAnswered
          }
        >
          {isEditMode
            ? t("datasetAssessments.form.updateButton")
            : t("datasetAssessments.form.createButton")}
        </RAButton>
      </RABox>

      {lockError && (
        <RABox
          sx={{
            position: "fixed",
            bottom: theme.spacing(2),
            right: theme.spacing(2),
            width: 300,
            zIndex: theme.zIndex.snackbar,
          }}
        >
          <RAAlert color="error" dismissible onClose={() => setLockError(null)}>
            <RATypography variant="body2" color="white">
              {lockError}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </>
  );
}
