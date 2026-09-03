import React from "react";
import PropTypes from "prop-types";
import { Card, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import PaginatedQuestionnaire from "components/input/RAQuestionnaire/PaginatedQuestionnaire";
import QuestionnaireCategoryTabs from "./QuestionnaireCategoryTabs";

const QUESTIONNAIRE_CARD_SX = {
  border: 1,
  borderColor: "divider",
  boxShadow: 1,
  borderRadius: 2,
  mb: 4,
  bgcolor: "background.paper",
};

function CenteredQuestionnaireState({ children }) {
  return (
    <RABox
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight={400}
      px={3}
    >
      {children}
    </RABox>
  );
}

function QuestionnaireSection({
  configurationId,
  loading,
  categories,
  questionsByCategory,
  questionnaireValues,
  activeCategoryCode,
  onCategoryChange,
  onAnswerChange,
  isReadOnly,
  showAllErrors,
}) {
  const { t } = useTranslation();

  if (!configurationId) {
    return (
      <Card sx={QUESTIONNAIRE_CARD_SX}>
        <CenteredQuestionnaireState>
          <RATypography variant="body1" align="center" color="text">
            {t("recipientAssessments.form.selectConfigPrompt")}
          </RATypography>
        </CenteredQuestionnaireState>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card sx={QUESTIONNAIRE_CARD_SX}>
        <CenteredQuestionnaireState>
          <CircularProgress />
        </CenteredQuestionnaireState>
      </Card>
    );
  }

  if (!categories.length) {
    return (
      <Card sx={QUESTIONNAIRE_CARD_SX}>
        <CenteredQuestionnaireState>
          <RATypography variant="body1" align="center" color="text">
            {t("recipientAssessments.form.noQuestionsForPhase")}
          </RATypography>
        </CenteredQuestionnaireState>
      </Card>
    );
  }

  const selectedCategoryCode = activeCategoryCode || categories[0]?.code;
  const visibleCategories =
    categories.length > 1
      ? categories.filter((category) => category.code === selectedCategoryCode)
      : categories;

  return (
    <Card sx={QUESTIONNAIRE_CARD_SX}>
      <QuestionnaireCategoryTabs
        categories={categories}
        activeCode={selectedCategoryCode}
        onChange={onCategoryChange}
      />

      <RABox mt={3} px={3} pb={3}>
        {visibleCategories.map((category) => {
          const categoryQuestions = questionsByCategory[category.code] || [];

          if (categoryQuestions.length === 0) {
            return (
              <RATypography
                key={category.code}
                variant="body1"
                align="center"
                color="text"
              >
                {t("recipientAssessments.form.noQuestionsForCategory", {
                  name: category.name,
                })}
              </RATypography>
            );
          }

          return (
            <RABox key={category.code}>
              <PaginatedQuestionnaire
                title={t("recipientAssessments.form.questionnaireOf", {
                  name: category.name,
                })}
                questions={categoryQuestions}
                values={questionnaireValues}
                onChange={onAnswerChange}
                disablePagination
                showRowNumbers
                sx={{ width: "100%" }}
                isReadOnly={isReadOnly}
                showAllErrors={showAllErrors}
                hideSubmit
              />
            </RABox>
          );
        })}
      </RABox>
    </Card>
  );
}

CenteredQuestionnaireState.propTypes = {
  children: PropTypes.node.isRequired,
};

QuestionnaireSection.propTypes = {
  configurationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  loading: PropTypes.bool.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  questionsByCategory: PropTypes.objectOf(PropTypes.array).isRequired,
  questionnaireValues: PropTypes.object.isRequired,
  activeCategoryCode: PropTypes.string,
  onCategoryChange: PropTypes.func.isRequired,
  onAnswerChange: PropTypes.func.isRequired,
  isReadOnly: PropTypes.bool.isRequired,
  showAllErrors: PropTypes.bool.isRequired,
};

QuestionnaireSection.defaultProps = {
  configurationId: "",
  activeCategoryCode: "",
};

export default QuestionnaireSection;
