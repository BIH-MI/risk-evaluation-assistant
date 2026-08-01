import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { MenuItem, CircularProgress, Box, Card } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAInput from "components/input/RAInput";
import RAButton from "components/input/RAButton";
import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import PaginatedQuestionnaire from "components/input/RAQuestionnaire/PaginatedQuestionnaire";
import RAAlert from "components/feedback/RAAlert";

import {
  addRecipientAssessment,
  updateRecipientAssessment,
} from "store/recipientAssessments/recipientAssessmentsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import {
  fetchConfigurations,
  fetchConfiguration,
} from "store/configurations/configurationThunks";
import { useActiveLock } from "hooks/locks/useActiveLock";

const EMPTY_ARRAY = [];

export default function AddEditRecipientAssessmentForm() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.access_token;

  // Extract i18n to dynamically determine the current active language
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "en";

  const { recipientId: recParam, assessmentId: asmtParam } = useParams();
  const recipientId = Number(recParam);
  const assessmentId = asmtParam ? Number(asmtParam) : null;
  const isEditMode = Boolean(assessmentId);

  const { items: recipients } = useSelector((state) => state.recipients);
  const { items: assessments } = useSelector(
    (state) => state.recipientAssessments
  );

  // FIXED: Removed categories and questions from the direct root selector
  const { items: configurations, loading: configLoading } = useSelector(
    (state) => state.configurations
  );

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState(
    recipientId || ""
  );
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [answers, setAnswers] = useState({});

  // Safely extract categories and questions directly from the fetched active configuration
  const activeConfig = useMemo(
    () => configurations.find((c) => c.id === selectedConfigId),
    [configurations, selectedConfigId]
  );

  const categories = activeConfig?.categories || EMPTY_ARRAY;
  const questions = activeConfig?.questions || EMPTY_ARRAY;

  const [activeQuestTab, setActiveQuestTab] = useState(0);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lockError, setLockError] = useState(null);

  const onLockFailed = useCallback(
    (err) => {
      setLockError(t("recipientAssessments.alerts.lockFailed"));
      setTimeout(
        () => navigate(`/recipients/${recipientId}/assessments`),
        2000
      );
    },
    [navigate, recipientId, t]
  );

  const hasLock = useActiveLock(
    "RECIPIENT_ASSESSMENT",
    isEditMode ? String(assessmentId) : null,
    onLockFailed
  );

  const isReadOnly = (isEditMode && !hasLock) || isSubmitting;

  useEffect(() => {
    if (token) {
      dispatch(fetchRecipients(token));
      dispatch(fetchConfigurations(token));
    }
  }, [dispatch, token]);

  // Automatically name the assessment in create mode when a recipient is selected
  useEffect(() => {
    if (!isEditMode && selectedRecipientId && !name) {
      const selectedRecipient = recipients.find(
        (r) => r.id === selectedRecipientId
      );
      if (selectedRecipient) {
        const nextIndex = (selectedRecipient.assessmentIds?.length || 0) + 1;
        setName(`${selectedRecipient.name} / Assessment ${nextIndex}`);
      }
    }
  }, [isEditMode, selectedRecipientId, recipients, name]);

  // Basic metadata prefill
  useEffect(() => {
    if (isEditMode && assessments.length > 0 && !name) {
      const assessment = assessments.find((a) => a.id === assessmentId);
      if (assessment) {
        setName(assessment.name || "");
        setDescription(assessment.description || "");
        setContactName(assessment.contactName || "");
        setEmail(assessment.email || "");
        setTelephone(assessment.telephone || "");
        setDepartment(assessment.department || "");
        setSelectedRecipientId(assessment.recipientId || "");
        setSelectedConfigId(assessment.configurationId || "");

      }
    }
  }, [isEditMode, assessmentId, assessments, name]);

  // Fetch deep configuration hierarchy when a config is selected
  useEffect(() => {
    if (selectedConfigId && token) {
      dispatch(fetchConfiguration({ id: selectedConfigId, token }));
      setActiveQuestTab(0);
    }
  }, [dispatch, selectedConfigId, token]);

  const recipientCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(
      (c) => c.assessmentPhase === "RECIPIENT_ASSESSMENT"
    );
  }, [categories]);

  const questionsByCategory = useMemo(() => {
    if (!questions || recipientCategories.length === 0) return {};
    const grouped = {};
    recipientCategories.forEach((cat) => {
      grouped[cat.code] = questions.filter((q) => q.categoryCode === cat.code);
    });
    return grouped;
  }, [questions, recipientCategories]);

  // Pre-fill answers ONCE the questions have been fully fetched from the configuration
  // AND auto-select the first option for any question that is left unanswered.
  useEffect(() => {
    if (
      selectedConfigId &&
      questions?.length > 0 &&
      recipientCategories?.length > 0
    ) {
      setAnswers((prevAnswers) => {
        const nextAnswers = { ...prevAnswers };
        let isModified = false;

        // 1. If in Edit Mode and we haven't loaded the assessment answers yet
        const assessment = assessments.find((a) => a.id === assessmentId);
        if (isEditMode && assessment && Object.keys(prevAnswers).length === 0) {
          (assessment.answers || []).forEach((ans) => {
            const q = questions.find((quest) => quest.id === ans.questionId);

            // ROBUST MATCH: Find the option via its exact Database ID
            let opt = null;
            if (ans.selectedOptionId) {
              opt = q?.options?.find(
                (o) => String(o.id) === String(ans.selectedOptionId)
              );
            }

            // Fallback for legacy records that might not have the ID yet
            if (!opt) {
              opt = q?.options?.find(
                (o) =>
                  o.text?.trim().toLowerCase() ===
                  (ans.selectedOptionText || ans.text || "")
                    .trim()
                    .toLowerCase()
              );
            }

            const rawValue =
              opt?.code ||
              opt?.id ||
              opt?.text ||
              ans.selectedOptionText ||
              ans.text;
            const valueToUse = rawValue != null ? String(rawValue) : "";
            const idToUse = ans.selectedOptionId || opt?.id || null;

            if (valueToUse) {
              nextAnswers[ans.questionId] = {
                optionId: idToUse,
                code: opt?.code || null,
                text: opt?.text || ans.selectedOptionText || ans.text,
                answer: valueToUse,
              };
              isModified = true;
            }
          });
        }

        // 2. Auto-select the first option for any unanswered recipient assessment questions
        recipientCategories.forEach((cat) => {
          const catQuestions = questions.filter(
            (q) => q.categoryCode === cat.code
          );
          catQuestions.forEach((q) => {
            if (!nextAnswers[q.id] && q.options?.length > 0) {
              const firstOpt = q.options[0];
              const rawValue = firstOpt.code || firstOpt.id || firstOpt.text;
              if (rawValue != null) {
                nextAnswers[q.id] = {
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

        return isModified ? nextAnswers : prevAnswers;
      });
    }
  }, [
    isEditMode,
    selectedConfigId,
    questions,
    assessments,
    assessmentId,
    recipientCategories,
  ]);

  // Handle Answer Change
  const handleAnswerChange = useCallback(
    (questionId, value) => {
      // NOTE: Uses original unlocalized questions from Redux so answering logic doesn't break
      const question = questions?.find((q) => q.id === questionId);

      // Ensure we compare Strings to Strings
      const selectedOption = question?.options?.find(
        (o) =>
          String(o.code) === String(value) ||
          String(o.id) === String(value) ||
          String(o.text) === String(value)
      );

      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          optionId: selectedOption?.id || null,
          code: selectedOption?.code || null,
          text: selectedOption?.text || value,
          answer: String(value), // Store strictly as a string
        },
      }));
    },
    [questions]
  );

  const allAnswered = useMemo(() => {
    if (!questions || recipientCategories.length === 0) return false;

    const requiredQuestionIds = [];
    recipientCategories.forEach((cat) => {
      const catQs = questions.filter(
        (q) => q.categoryCode === cat.code && q.isRequired
      );
      requiredQuestionIds.push(...catQs.map((q) => q.id));
    });

    return requiredQuestionIds.every((id) => answers[id]?.answer);
  }, [answers, questions, recipientCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowAllErrors(true);

    if (!name.trim()) return;
    setIsSubmitting(true);

    const assessmentPayload = {
      name,
      description,
      contactName,
      email,
      telephone,
      department,
      recipientId: selectedRecipientId,
      configurationId: selectedConfigId,
      answers: Object.entries(answers).map(([qId, ansData]) => ({
        questionId: Number(qId),
        selectedOptionId: ansData.optionId,
        selectedOptionCode: ansData.code !== ansData.text ? ansData.code : null,
        text: ansData.text,
      })),
    };

    try {
      if (isEditMode) {
        await dispatch(
          updateRecipientAssessment({
            recipientId: selectedRecipientId,
            assessmentId: assessmentId,
            updatedAssessment: assessmentPayload,
            token,
          })
        ).unwrap();
      } else {
        await dispatch(
          addRecipientAssessment({
            recipientId: selectedRecipientId,
            newAssessment: assessmentPayload,
            token,
          })
        ).unwrap();
      }
      navigate(`/recipients/${selectedRecipientId}/assessments`);
    } catch (err) {
      setLockError(err.message || t("recipientAssessments.alerts.saveFailed"));
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
        gap={3}
        p={3}
        maxWidth="1200px"
        width="100%"
        mx="auto"
      >
        <RATypography variant="h4" fontWeight="bold" align="center">
          {isEditMode
            ? t("recipientAssessments.form.editTitle")
            : t("recipientAssessments.form.newTitle")}
        </RATypography>

        {/* Core Info Block */}
        <RABox display="flex" flexDirection="column" gap={2}>
          <RAInput
            select
            label={t("recipientAssessments.form.recipientLabel")}
            value={selectedRecipientId}
            onChange={(e) => setSelectedRecipientId(e.target.value)}
            fullWidth
            required
            disabled={isReadOnly || isEditMode}
          >
            {recipients.map((rec) => (
              <MenuItem key={rec.id} value={rec.id}>
                {rec.organization || rec.name}
              </MenuItem>
            ))}
          </RAInput>
          <RAInput
            select
            label={t("recipientAssessments.form.configurationLabel")}
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
            label={t("recipientAssessments.form.assessmentNameLabel")}
            value={name}
            onCommit={setName}
            fullWidth
            required
            disabled={isReadOnly}
          />
          <OnBlurRAInput
            label={t("recipientAssessments.form.descriptionLabel")}
            value={description}
            onCommit={setDescription}
            fullWidth
            multiline
            minRows={3}
            disabled={isReadOnly}
          />
        </RABox>

        {/* Questionnaire Block with Card Layout & Grid Tabs */}
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
            ) : recipientCategories.length > 0 ? (
              <>
                {recipientCategories.length > 1 && (
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
                      {t("recipientAssessments.form.contextRiskCategories")}
                    </RATypography>

                    <Box
                      display="flex"
                      flexWrap="wrap"
                      justifyContent="center"
                      gap={1.5}
                    >
                      {recipientCategories.map((cat, globalIndex) => {
                        const isActive = activeQuestTab === globalIndex;
                        return (
                          <RAButton
                            key={cat.code}
                            variant={isActive ? "contained" : "outlined"}
                            color={isActive ? "primary" : "secondary"}
                            onClick={() => setActiveQuestTab(globalIndex)}
                            sx={{
                              width: { xs: "100%", sm: "auto" }, // Full width on mobile, auto on desktop
                              minWidth: { sm: "200px" }, // Ensures uniform button sizes
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
                  {recipientCategories.map((cat, index) => {
                    if (
                      recipientCategories.length > 1 &&
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
                          {t(
                            "recipientAssessments.form.noQuestionsForCategory",
                            { name: cat.name }
                          )}
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
                          title={t(
                            "recipientAssessments.form.questionnaireOf",
                            { name: cat.name }
                          )}
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
                  {t("recipientAssessments.form.noQuestionsForPhase")}
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
                {t("recipientAssessments.form.selectConfigPrompt")}
              </RATypography>
            </RABox>
          )}
        </Card>

        <RAButton
          type="submit"
          variant="contained"
          color="primary"
          sx={{ alignSelf: "center", mt: 3, minWidth: 200 }}
          disabled={
            isReadOnly ||
            !name.trim() ||
            !selectedRecipientId ||
            !selectedConfigId ||
            !allAnswered // <-- Added to prevent submitting empty answers
          }
        >
          {isEditMode
            ? t("recipientAssessments.form.updateButton")
            : t("recipientAssessments.form.createButton")}
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
