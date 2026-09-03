export const RECIPIENT_ASSESSMENT_PHASE = "RECIPIENT_ASSESSMENT";

export function createEmptyRecipientAssessmentForm() {
  return {
    name: "",
    description: "",
    contactName: "",
    email: "",
    telephone: "",
    department: "",
    recipientId: "",
    configurationId: "",
  };
}

export function initializeFormFromAssessment(assessment) {
  return {
    name: assessment?.name || "",
    description: assessment?.description || "",
    contactName: assessment?.contactName || "",
    email: assessment?.email || "",
    telephone: assessment?.telephone || "",
    department: assessment?.department || "",
    recipientId: assessment?.recipientId || "",
    configurationId: assessment?.configurationId || "",
  };
}

export function buildSuggestedAssessmentName(recipient) {
  if (!recipient) return "";

  const nextIndex = (recipient.assessmentIds?.length || 0) + 1;
  return `${recipient.name} / Assessment ${nextIndex}`;
}

export function getDefaultConfiguration(configurations) {
  const activeConfigurations = (configurations || []).filter(
    (configuration) => configuration.isActive
  );

  return (
    activeConfigurations.find((configuration) => configuration.isDefault) ||
    activeConfigurations[0] ||
    null
  );
}

export function buildConfigurationOptions({
  configurations,
  activeConfiguration,
  isEditMode,
}) {
  const optionsById = new Map();

  (configurations || [])
    .filter((configuration) => configuration.isActive)
    .forEach((configuration) => {
      optionsById.set(String(configuration.id), configuration);
    });

  /**
   * Existing assessments keep their saved configuration even if that
   * configuration has since been archived.
   */
  if (isEditMode && activeConfiguration?.id != null) {
    optionsById.set(String(activeConfiguration.id), activeConfiguration);
  }

  return Array.from(optionsById.values());
}

export function getRecipientAssessmentCategories(categories) {
  return (categories || []).filter(
    (category) => category.assessmentPhase === RECIPIENT_ASSESSMENT_PHASE
  );
}

export function getRecipientAssessmentQuestions(questions, categories) {
  if (!questions?.length || !categories?.length) return [];

  const allowedCategoryCodes = new Set(
    categories.map((category) => category.code)
  );

  /**
   * The API exposes assessment phase on categories, not questions. Recipient
   * assessment questions are therefore identified through their category code.
   */
  return questions.filter((question) =>
    allowedCategoryCodes.has(question.categoryCode)
  );
}

export function groupQuestionsByCategory(questions, allowedCategories) {
  if (!allowedCategories?.length) return {};

  const grouped = Object.fromEntries(
    allowedCategories.map((category) => [category.code, []])
  );
  const allowedCategoryCodes = new Set(
    allowedCategories.map((category) => category.code)
  );

  (questions || []).forEach((question) => {
    if (allowedCategoryCodes.has(question.categoryCode)) {
      grouped[question.categoryCode].push(question);
    }
  });

  return grouped;
}

function normalizeForMatch(value) {
  return value == null ? "" : String(value).trim().toLowerCase();
}

function hasSameRawValue(candidate, value) {
  return (
    candidate != null && value != null && String(candidate) === String(value)
  );
}

export function findSelectedQuestionOption(question, value) {
  return (question?.options || []).find(
    (option) =>
      hasSameRawValue(option.code, value) ||
      hasSameRawValue(option.id, value) ||
      hasSameRawValue(option.text, value)
  );
}

/**
 * New assessments reference options by database ID. Text matching remains only
 * as a compatibility fallback for historical assessments created before
 * option IDs were persisted.
 */
export function findPersistedAnswerOption(question, persistedAnswer) {
  if (!question || !persistedAnswer) return null;

  if (persistedAnswer.selectedOptionId) {
    const optionById = (question.options || []).find(
      (option) => String(option.id) === String(persistedAnswer.selectedOptionId)
    );

    if (optionById) return optionById;
  }

  const persistedText = normalizeForMatch(
    persistedAnswer.selectedOptionText || persistedAnswer.text || ""
  );

  return (question.options || []).find(
    (option) => normalizeForMatch(option.text) === persistedText
  );
}

function getOptionQuestionnaireValue(option) {
  return option?.code || option?.id || option?.text;
}

export function buildAnswerState(selectedOption, value) {
  return {
    optionId: selectedOption?.id || null,
    code: selectedOption?.code || null,
    text: selectedOption?.text || value,
    answer: String(value),
  };
}

function buildDefaultAnswerState(option) {
  const value = getOptionQuestionnaireValue(option);

  if (value == null) return null;

  return buildAnswerState(option, value);
}

export function restoreAssessmentAnswers({ persistedAnswers, questions }) {
  const questionsById = new Map(
    (questions || []).map((question) => [String(question.id), question])
  );

  return (persistedAnswers || []).reduce((restoredAnswers, persistedAnswer) => {
    const question = questionsById.get(String(persistedAnswer.questionId));
    const selectedOption = findPersistedAnswerOption(question, persistedAnswer);
    const rawValue =
      getOptionQuestionnaireValue(selectedOption) ||
      persistedAnswer.selectedOptionText ||
      persistedAnswer.text;

    if (rawValue == null || rawValue === "") return restoredAnswers;

    return {
      ...restoredAnswers,
      [persistedAnswer.questionId]: {
        optionId:
          persistedAnswer.selectedOptionId || selectedOption?.id || null,
        code: selectedOption?.code || null,
        text:
          selectedOption?.text ||
          persistedAnswer.selectedOptionText ||
          persistedAnswer.text,
        answer: String(rawValue),
      },
    };
  }, {});
}

export function applyDefaultQuestionAnswers({ answers, questions }) {
  let hasChanges = false;
  const nextAnswers = { ...(answers || {}) };

  (questions || []).forEach((question) => {
    if (nextAnswers[question.id] || !question.options?.length) return;

    const defaultAnswer = buildDefaultAnswerState(question.options[0]);
    if (!defaultAnswer) return;

    nextAnswers[question.id] = defaultAnswer;
    hasChanges = true;
  });

  return hasChanges ? nextAnswers : answers || {};
}

export function areRequiredQuestionsAnswered({
  categories,
  questionsByCategory,
  answers,
}) {
  if (!categories?.length) return false;

  return categories.every((category) =>
    (questionsByCategory[category.code] || [])
      .filter((question) => question.isRequired === true)
      .every((question) => Boolean(answers[question.id]?.answer))
  );
}

export function localizeQuestion(question, language) {
  return {
    ...question,
    text: question.textTranslations?.[language] || question.text,
    options: (question.options || []).map((option) => ({
      ...option,
      text: option.textTranslations?.[language] || option.text,
    })),
  };
}

export function localizeQuestions(questions, language) {
  return (questions || []).map((question) =>
    localizeQuestion(question, language)
  );
}

export function localizeQuestionsByCategory(questionsByCategory, language) {
  return Object.fromEntries(
    Object.entries(questionsByCategory || {}).map(
      ([categoryCode, questions]) => [
        categoryCode,
        localizeQuestions(questions, language),
      ]
    )
  );
}

export function buildQuestionnaireValues(answers) {
  return Object.fromEntries(
    Object.entries(answers || {}).map(([questionId, { answer }]) => [
      Number(questionId),
      answer,
    ])
  );
}

function getPayloadSelectedOptionCode(answerData) {
  /**
   * Preserve the existing frontend contract: selectedOptionCode is only sent
   * when it carries information beyond the selected option display text.
   */
  return answerData.code !== answerData.text ? answerData.code : null;
}

export function buildRecipientAssessmentPayload({ form, answers }) {
  return {
    name: form.name,
    description: form.description,
    contactName: form.contactName,
    email: form.email,
    telephone: form.telephone,
    department: form.department,
    recipientId: form.recipientId,
    configurationId: form.configurationId,
    answers: Object.entries(answers || {}).map(([questionId, answerData]) => ({
      questionId: Number(questionId),
      selectedOptionId: answerData.optionId,
      selectedOptionCode: getPayloadSelectedOptionCode(answerData),
      text: answerData.text,
    })),
  };
}
