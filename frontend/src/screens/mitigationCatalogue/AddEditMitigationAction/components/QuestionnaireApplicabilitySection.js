import React, { useMemo } from "react";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import CloseIcon from "@mui/icons-material/Close";
import AddCircleIcon from "@mui/icons-material/AddCircle";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RAInput from "components/input/RAInput";

import AdminField, { selectWrapSx } from "./AdminField";
import { FIELD_HELP } from "./fieldHelp";
import MitigationActionSection from "./MitigationActionSection";

export default function QuestionnaireApplicabilitySection({
  mappings,
  errors,
  showErrors,
  configurations,
  onAdd,
  onUpdate,
  onRemove,
}) {
  const configurationMap = useMemo(
    () =>
      new Map(
        configurations.map((configuration) => [
          String(configuration.id),
          configuration,
        ])
      ),
    [configurations]
  );

  return (
    <MitigationActionSection
      title="Questionnaire Applicability"
      description="Connect this control to existing Recipient Assessment questions. The mapping defines when the action may be suggested and how a verified implementation could be evaluated in a counterfactual assessment. It never changes the stored assessment."
    >
      <RABox display="flex" flexDirection="column" gap={2}>
        {mappings.map((mapping, index) => (
          <React.Fragment key={mapping.clientId}>
            <QuestionnaireApplicabilityRule
              mapping={mapping}
              errors={errors[index] || {}}
              showErrors={showErrors}
              configurations={configurations}
              configurationMap={configurationMap}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
            {index < mappings.length - 1 && <Divider sx={{ borderColor: "divider" }} />}
          </React.Fragment>
        ))}
        <RABox>
          <RAButton
            type="button"
            variant="text"
            color="primary"
            startIcon={<AddCircleIcon />}
            onClick={onAdd}
          >
            Add Questionnaire Applicability Rule
          </RAButton>
        </RABox>
      </RABox>
    </MitigationActionSection>
  );
}

function QuestionnaireApplicabilityRule({
  mapping,
  errors,
  showErrors,
  configurations,
  configurationMap,
  onUpdate,
  onRemove,
}) {
  const selectedConfiguration = configurationMap.get(
    String(mapping.configurationId || "")
  );
  const questions = getControlQuestions(selectedConfiguration);
  const selectedQuestion = questions.find(
    (question) => question.code === mapping.questionCode
  );
  const answerOptions = (selectedQuestion?.options || []).filter(
    (option) => option.code
  );
  const projectedOptions = mapping.triggerOptionCode
    ? answerOptions.filter((option) => option.code !== mapping.triggerOptionCode)
    : answerOptions;

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      <RABox display="flex" justifyContent="flex-end" mb={-0.5}>
        <IconButton
          color="error"
          onClick={() => onRemove(mapping.clientId)}
          aria-label="Remove questionnaire applicability rule"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </RABox>

      <AdminField
        label="Risk Framework"
        info={FIELD_HELP.riskFramework}
        error={showErrors ? errors.configurationId : ""}
      >
        <RAInput
          select
          value={mapping.configurationId || ""}
          onChange={(event) =>
            onUpdate(mapping.clientId, {
              configurationId: event.target.value,
              questionCode: "",
              triggerOptionCode: "",
              projectedOptionCode: "",
            })
          }
          inputProps={{ "aria-label": "Risk Framework" }}
          fullWidth
          size="small"
          sx={selectWrapSx}
          error={showErrors && Boolean(errors.configurationId)}
        >
          <MenuItem value="" disabled>
            Select a framework
          </MenuItem>
          {configurations.map((configuration) => (
            <MenuItem key={configuration.id} value={String(configuration.id)}>
              {configuration.name}
            </MenuItem>
          ))}
        </RAInput>
      </AdminField>

      <AdminField
        label="Applicable Control Question"
        error={showErrors ? errors.questionCode : ""}
      >
        <RAInput
          select
          value={mapping.questionCode || ""}
          onChange={(event) =>
            onUpdate(mapping.clientId, {
              questionCode: event.target.value,
              triggerOptionCode: "",
              projectedOptionCode: "",
            })
          }
          inputProps={{ "aria-label": "Applicable Control Question" }}
          fullWidth
          size="small"
          sx={selectWrapSx}
          disabled={!selectedConfiguration}
          error={showErrors && Boolean(errors.questionCode)}
        >
          <MenuItem value="" disabled>
            Select a control question
          </MenuItem>
          {questions.map((question) => (
            <MenuItem
              key={question.code}
              value={question.code}
              sx={{ whiteSpace: "normal" }}
            >
              {question.text}
            </MenuItem>
          ))}
        </RAInput>
      </AdminField>

      <AdminField
        label="Suggest this action when the current answer is"
        info={FIELD_HELP.triggerAnswer}
        error={showErrors ? errors.triggerOptionCode : ""}
      >
        <RAInput
          select
          value={mapping.triggerOptionCode || ""}
          onChange={(event) => {
            const triggerOptionCode = event.target.value;
            onUpdate(mapping.clientId, {
              triggerOptionCode,
              projectedOptionCode:
                mapping.projectedOptionCode === triggerOptionCode
                  ? ""
                  : mapping.projectedOptionCode,
            });
          }}
          inputProps={{
            "aria-label": "Suggest this action when the current answer is",
          }}
          fullWidth
          size="small"
          sx={selectWrapSx}
          disabled={!selectedQuestion}
          error={showErrors && Boolean(errors.triggerOptionCode)}
        >
          <MenuItem value="" disabled>
            Select current answer
          </MenuItem>
          {answerOptions.map((option) => (
            <MenuItem
              key={option.code}
              value={option.code}
              sx={{ whiteSpace: "normal" }}
            >
              {option.text}
            </MenuItem>
          ))}
        </RAInput>
      </AdminField>

      <AdminField
        label="After verified implementation, evaluate this as"
        info={FIELD_HELP.projectedAnswer}
        error={showErrors ? errors.projectedOptionCode : ""}
      >
        <RAInput
          select
          value={
            mapping.projectedOptionCode === mapping.triggerOptionCode
              ? ""
              : mapping.projectedOptionCode || ""
          }
          onChange={(event) =>
            onUpdate(mapping.clientId, {
              projectedOptionCode: event.target.value,
            })
          }
          inputProps={{
            "aria-label": "After verified implementation, evaluate this as",
          }}
          fullWidth
          size="small"
          sx={selectWrapSx}
          disabled={!selectedQuestion}
          error={showErrors && Boolean(errors.projectedOptionCode)}
        >
          <MenuItem value="" disabled>
            Select verified answer
          </MenuItem>
          {projectedOptions.map((option) => (
            <MenuItem
              key={option.code}
              value={option.code}
              sx={{ whiteSpace: "normal" }}
            >
              {option.text}
            </MenuItem>
          ))}
        </RAInput>
      </AdminField>
    </RABox>
  );
}

function getControlQuestions(configuration) {
  if (!configuration) return [];
  const categories = configuration.riskCategories || configuration.categories || [];
  const recipientControlCategoryCodes = new Set(
    categories
      .filter(
        (category) =>
          category.assessmentPhase === "RECIPIENT_ASSESSMENT" &&
          category.code === "CONTROLS"
      )
      .map((category) => category.code)
  );

  return (configuration.questions || []).filter((question) => {
    if (!question.code) return false;
    if (recipientControlCategoryCodes.size === 0) {
      return question.categoryCode === "CONTROLS";
    }
    return recipientControlCategoryCodes.has(question.categoryCode);
  });
}
