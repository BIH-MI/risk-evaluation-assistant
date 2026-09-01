import React from "react";
import { Box, Card, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAButton from "components/input/RAButton";
import PaginatedQuestionnaire from "components/input/RAQuestionnaire/PaginatedQuestionnaire";

function buildLocalizedQuestions(questions, language) {
  return questions.map((question) => ({
    ...question,
    text: question.textTranslations?.[language] || question.text,
    options: (question.options || []).map((option) => ({
      ...option,
      text: option.textTranslations?.[language] || option.text,
    })),
  }));
}

function QuestionnaireSection({
  selectedConfigId,
  configLoading,
  datasetCategories,
  questionsByCategory,
  activeQuestTab,
  setActiveQuestTab,
  answers,
  handleAnswerChange,
  currentLang,
  isReadOnly,
  showAllErrors,
}) {
  const { t } = useTranslation();

  return (
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
                  {datasetCategories.map((category, globalIndex) => {
                    const isActive = activeQuestTab === globalIndex;
                    return (
                      <RAButton
                        key={category.code}
                        variant={isActive ? "contained" : "outlined"}
                        color={isActive ? "primary" : "secondary"}
                        onClick={() => setActiveQuestTab(globalIndex)}
                        sx={{
                          width: { xs: "100%", sm: "auto" },
                          minWidth: { sm: "200px" },
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
                        {category.name}
                      </RAButton>
                    );
                  })}
                </Box>
              </RABox>
            )}

            <RABox mt={3} px={3} pb={3}>
              {datasetCategories.map((category, index) => {
                if (
                  datasetCategories.length > 1 &&
                  index !== activeQuestTab
                ) {
                  return null;
                }

                const categoryQuestions =
                  questionsByCategory[category.code] || [];
                if (categoryQuestions.length === 0) {
                  return (
                    <RATypography
                      key={category.code}
                      variant="body1"
                      align="center"
                      color="text"
                    >
                      {t("datasetAssessments.form.noQuestionsForCategory", {
                        name: category.name,
                      })}
                    </RATypography>
                  );
                }

                return (
                  <RABox key={category.code}>
                    <PaginatedQuestionnaire
                      title={t("datasetAssessments.form.questionnaireOf", {
                        name: category.name,
                      })}
                      questions={buildLocalizedQuestions(
                        categoryQuestions,
                        currentLang
                      )}
                      values={Object.fromEntries(
                        Object.entries(answers).map(
                          ([questionId, { answer }]) => [
                            Number(questionId),
                            answer,
                          ]
                        )
                      )}
                      onChange={handleAnswerChange}
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
  );
}

export default QuestionnaireSection;
