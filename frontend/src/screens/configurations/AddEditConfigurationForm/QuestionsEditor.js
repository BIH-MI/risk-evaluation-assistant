import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Collapse,
  MenuItem,
  Select,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CloseIcon from "@mui/icons-material/Close";
import TranslateIcon from "@mui/icons-material/Translate";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import { useTranslation } from "react-i18next";

import { GB, DE } from "country-flag-icons/react/3x2";

import RABox from "../../../components/layout/RABox";
import RATypography from "../../../components/display/RATypography";
import RAButton from "../../../components/input/RAButton";
import RAInput from "../../../components/input/RAInput";
import OnBlurRAInput from "../../../components/input/RAInput/OnBlurRAInput";

import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from "../../../store/configurations/configurationSlice";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", Icon: GB },
  { code: "de", label: "Deutsch", Icon: DE },
];

const TranslationManager = ({
  translations,
  onChange,
  defaultLanguage,
  rightWidth,
  isOption,
  isReadOnly,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const entries = Object.entries(translations || {});

  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => lang.code !== defaultLanguage
  );

  const updateTranslationKey = (oldKey, newKey) => {
    const newTrans = {};
    entries.forEach(([k, v]) => {
      if (k === oldKey) {
        if (newKey) newTrans[newKey] = v;
      } else {
        newTrans[k] = v;
      }
    });
    if (!oldKey && newKey) newTrans[newKey] = "";
    onChange(newTrans);
  };

  const updateTranslationValue = (key, val) =>
    onChange({ ...translations, [key]: val });

  const removeTranslation = (keyToRemove) => {
    const newTrans = { ...translations };
    delete newTrans[keyToRemove];
    onChange(newTrans);
  };

  const addTranslation = () => {
    const usedLangs = Object.keys(translations || {});
    const nextAvailableLang = availableLanguages.find(
      (lang) => !usedLangs.includes(lang.code)
    );
    if (nextAvailableLang) {
      onChange({ ...translations, [nextAvailableLang.code]: "" });
      setIsOpen(true);
    }
  };

  return (
    <RABox mt={0.5} width="100%">
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <RABox flex={1} display="flex" gap={1} alignItems="center">
          {isOption && <SubdirectoryArrowRightIcon sx={{ opacity: 0 }} />}
          <RAButton
            variant="text"
            color="secondary"
            size="small"
            startIcon={<TranslateIcon />}
            onClick={() => setIsOpen(!isOpen)}
            sx={{ p: 0, minHeight: 0, mb: isOpen ? 1 : 0 }}
          >
            {isOpen
              ? t(
                  "configurations.questions.hideTranslations",
                  "Hide Translations"
                )
              : t("configurations.questions.manageTranslations", {
                  count: entries.length,
                  defaultValue: `Manage Translations (${entries.length})`,
                })}
          </RAButton>
        </RABox>
        <RABox
          width={{ xs: "100%", md: rightWidth }}
          display={{ xs: "none", md: "block" }}
        />
      </Stack>

      <Collapse in={isOpen}>
        <RABox pt={0.5}>
          {entries.map(([lang, text], i) => (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              mb={1}
              alignItems="center"
              key={i}
            >
              <RABox
                flex={1}
                width="100%"
                display="flex"
                gap={1}
                alignItems="center"
              >
                {isOption && <SubdirectoryArrowRightIcon sx={{ opacity: 0 }} />}
                <OnBlurRAInput
                  size="small"
                  label={t(
                    "configurations.questions.translatedText",
                    "Translated Text"
                  )}
                  value={text}
                  onCommit={(v) => updateTranslationValue(lang, v)}
                  fullWidth
                  disabled={isReadOnly} // <-- Disabled if read-only
                />
              </RABox>

              <RABox
                width={{ xs: "100%", md: rightWidth }}
                display="flex"
                gap={1}
                alignItems="center"
              >
                <Select
                  value={lang}
                  onChange={(e) => updateTranslationKey(lang, e.target.value)}
                  variant="standard"
                  disableUnderline
                  disabled={isReadOnly} // <-- Disabled if read-only
                  MenuProps={{
                    PaperProps: {
                      sx: { minWidth: "unset !important" },
                    },
                  }}
                  sx={{
                    width: 32,
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pb: 0,
                      pt: 0,
                      "&:focus": { backgroundColor: "transparent" },
                    },
                    "& .MuiSvgIcon-root": { display: "none" },
                  }}
                  renderValue={(selected) => {
                    const selectedLang = SUPPORTED_LANGUAGES.find(
                      (l) => l.code === selected
                    );
                    return selectedLang ? (
                      <RABox
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <selectedLang.Icon
                          style={{
                            width: "24px",
                            borderRadius: "2px",
                            display: "block",
                          }}
                        />
                      </RABox>
                    ) : (
                      selected
                    );
                  }}
                >
                  {availableLanguages.map((l) => (
                    <MenuItem
                      key={l.code}
                      value={l.code}
                      disabled={
                        Object.keys(translations || {}).includes(l.code) &&
                        l.code !== lang
                      }
                      sx={{
                        minWidth: "unset !important",
                        justifyContent: "center",
                        px: 1,
                      }}
                    >
                      <RABox display="flex" alignItems="center">
                        <l.Icon
                          style={{
                            width: "24px",
                            borderRadius: "2px",
                          }}
                        />
                      </RABox>
                    </MenuItem>
                  ))}
                </Select>

                {/* Hide remove button if read-only */}
                {!isReadOnly && (
                  <IconButton
                    color="error"
                    onClick={() => removeTranslation(lang)}
                    size="small"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </RABox>
            </Stack>
          ))}

          {/* Hide Add Language button if read-only */}
          {!isReadOnly && entries.length < availableLanguages.length && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={1}>
              <RABox flex={1} display="flex" gap={1} alignItems="center">
                {isOption && <SubdirectoryArrowRightIcon sx={{ opacity: 0 }} />}
                <RAButton
                  variant="text"
                  color="info"
                  size="small"
                  onClick={addTranslation}
                >
                  {t("configurations.questions.addLanguage", "+ Add Language")}
                </RAButton>
              </RABox>
              <RABox
                width={{ xs: "100%", md: rightWidth }}
                display={{ xs: "none", md: "block" }}
              />
            </Stack>
          )}
        </RABox>
      </Collapse>
    </RABox>
  );
};

export default function QuestionsEditor({ categoryCode, isReadOnly }) {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const allQuestions = useSelector(
    (state) => state.configurations.configDetails?.questions
  );
  const defaultLanguage =
    useSelector(
      (state) => state.configurations.configDetails?.defaultLanguage
    ) || "en";

  const questions = React.useMemo(
    () =>
      !allQuestions
        ? []
        : allQuestions.filter((q) => q.categoryCode === categoryCode),
    [allQuestions, categoryCode]
  );

  const handleAddQuestion = () =>
    dispatch(
      addQuestion({
        text: "",
        textTranslations: {},
        explanation: "",
        weight: 1.0,
        isRequired: true,
        options: [],
        categoryCode,
        _tempId: Date.now(),
      })
    );

  const handleDelete = (idOrTempId) => dispatch(deleteQuestion(idOrTempId));
  const updateQ = (q, field, value) =>
    dispatch(updateQuestion({ ...q, [field]: value }));

  const addOption = (q) => {
    const newOptions = [
      ...(q.options || []),
      {
        _tempId: Date.now(),
        code: "",
        text: "",
        textTranslations: {},
        score: 0.0,
        impact: "NEUTRAL",
        isHighRiskTrigger: false,
      },
    ];
    updateQ(q, "options", newOptions);
  };

  const removeOption = (q, index) =>
    updateQ(
      q,
      "options",
      q.options.filter((_, i) => i !== index)
    );

  const updateOption = (q, index, field, value) => {
    const newOptions = [...q.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    updateQ(q, "options", newOptions);
  };

  return (
    <RABox>
      {questions.map((q) => (
        <RABox
          key={q.id || q._tempId}
          mb={4}
          p={3}
          borderRadius="lg"
          border="1px solid #e0e0e0"
          bgcolor="#fafafa"
          boxShadow={1}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems="center"
            mb={0}
          >
            <RABox flex={1} width="100%">
              <OnBlurRAInput
                size="small"
                label={t(
                  "configurations.questions.questionText",
                  "Question Text"
                )}
                value={q.text || ""}
                onCommit={(v) => updateQ(q, "text", v)}
                fullWidth
                multiline
                minRows={1}
                disabled={isReadOnly} // <-- Disabled if read-only
              />
            </RABox>
            <RABox
              width={{ xs: "100%", md: "160px" }}
              display="flex"
              gap={2}
              alignItems="center"
            >
              <OnBlurRAInput
                size="small"
                type="number"
                label={t("configurations.questions.weight", "Weight")}
                value={q.weight ?? 1.0}
                onCommit={(v) => updateQ(q, "weight", Number(v))}
                sx={{ flex: 1, "& .MuiInputBase-root": { height: "40px" } }}
                disabled={isReadOnly} // <-- Disabled if read-only
              />
              {/* Hide delete button if read-only */}
              {!isReadOnly && (
                <IconButton
                  color="error"
                  onClick={() => handleDelete(q.id || q._tempId)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </RABox>
          </Stack>

          <TranslationManager
            translations={q.textTranslations}
            onChange={(newMap) => updateQ(q, "textTranslations", newMap)}
            defaultLanguage={defaultLanguage}
            rightWidth="160px"
            isOption={false}
            isReadOnly={isReadOnly}
          />

          <RABox mt={2}>
            {q.options?.map((opt, index) => (
              <RABox key={opt.id || opt.code || opt._tempId || index} mb={1}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems="center"
                  mb={0}
                >
                  <RABox
                    flex={1}
                    width="100%"
                    display="flex"
                    gap={1}
                    alignItems="center"
                  >
                    <SubdirectoryArrowRightIcon
                      sx={{ color: "text.disabled" }}
                    />
                    <OnBlurRAInput
                      label={t(
                        "configurations.questions.optionText",
                        "Option Text"
                      )}
                      value={opt.text || ""}
                      onCommit={(v) => updateOption(q, index, "text", v)}
                      size="small"
                      fullWidth
                      disabled={isReadOnly} // <-- Disabled if read-only
                    />
                  </RABox>

                  <RABox
                    width={{ xs: "100%", md: "360px" }}
                    display="flex"
                    gap={2}
                    alignItems="center"
                  >
                    <RAInput
                      select
                      size="small"
                      label={t("configurations.questions.impact", "Impact")}
                      value={opt.impact || "NEUTRAL"}
                      onChange={(e) =>
                        updateOption(q, index, "impact", e.target.value)
                      }
                      disabled={isReadOnly} // <-- Disabled if read-only
                      sx={{
                        width: 130,
                        "& .MuiInputBase-root": { height: "40px" },
                      }}
                    >
                      <MenuItem value="POSITIVE">Positive (+)</MenuItem>
                      <MenuItem value="NEUTRAL">Neutral</MenuItem>
                      <MenuItem value="NEGATIVE">Negative (-)</MenuItem>
                    </RAInput>
                    <OnBlurRAInput
                      type="number"
                      label={t("configurations.questions.score", "Score")}
                      value={opt.score ?? 0.0}
                      onCommit={(v) =>
                        updateOption(q, index, "score", Number(v))
                      }
                      size="small"
                      disabled={isReadOnly} // <-- Disabled if read-only
                      sx={{
                        width: 100,
                        "& .MuiInputBase-root": { height: "40px" },
                      }}
                    />
                    <Tooltip
                      title={t(
                        "configurations.questions.instantFail",
                        "Scores entire category as maximum risk"
                      )}
                      placement="top"
                      arrow
                    >
                      <span>
                        <Switch
                          size="small"
                          checked={opt.isHighRiskTrigger || false}
                          onChange={(e) =>
                            updateOption(
                              q,
                              index,
                              "isHighRiskTrigger",
                              e.target.checked
                            )
                          }
                          disabled={isReadOnly} // <-- Disabled if read-only
                        />
                      </span>
                    </Tooltip>

                    {/* Hide remove option button if read-only */}
                    {!isReadOnly && (
                      <IconButton
                        color="error"
                        onClick={() => removeOption(q, index)}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </RABox>
                </Stack>

                <TranslationManager
                  translations={opt.textTranslations}
                  onChange={(newMap) =>
                    updateOption(q, index, "textTranslations", newMap)
                  }
                  defaultLanguage={defaultLanguage}
                  rightWidth="360px"
                  isOption={true}
                  isReadOnly={isReadOnly}
                />
              </RABox>
            ))}

            {/* Hide add option button if read-only */}
            {!isReadOnly && (
              <RABox mt={1}>
                <RAButton
                  variant="text"
                  color="primary"
                  startIcon={<AddCircleIcon />}
                  onClick={() => addOption(q)}
                >
                  {t("configurations.questions.addOption", "Add Option")}
                </RAButton>
              </RABox>
            )}
          </RABox>
        </RABox>
      ))}

      {questions.length === 0 && (
        <RABox
          display="flex"
          justifyContent="center"
          width="100%"
          mt={2}
          mb={3}
        >
          <RATypography variant="button" color="text" align="center">
            {t(
              "configurations.questions.noQuestions",
              "No questions found for this category."
            )}
          </RATypography>
        </RABox>
      )}

      {/* Hide add question button if read-only */}
      {!isReadOnly && (
        <RABox display="flex" justifyContent="center">
          <RAButton
            variant="outlined"
            color="primary"
            startIcon={<AddCircleIcon />}
            onClick={handleAddQuestion}
          >
            {t("configurations.questions.addQuestion", "Add Question")}
          </RAButton>
        </RABox>
      )}
    </RABox>
  );
}
