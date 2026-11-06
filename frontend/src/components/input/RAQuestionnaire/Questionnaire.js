import React, { useId } from "react";
import PropTypes from "prop-types";
import { FormControlLabel, IconButton, Radio, RadioGroup, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";
import { alpha, useTheme } from "@mui/material/styles";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

function getQuestionRowSx({ isLast, isOutdated }) {
  return (theme) => ({
    backgroundColor: isOutdated
      ? alpha(theme.palette.error.main, 0.12)
      : "transparent",
    borderBottom: isLast
      ? "none"
      : `1px solid ${theme.palette.light?.main || theme.palette.divider}`,
  });
}

export default function Questionnaire({
  questions,
  values,
  onChange,
  pageSize,
  sx,
  showRowNumbers,
  isReadOnly,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const questionnaireId = useId();

  return (
    <RABox sx={{ width: "100%", height: "100%", ...sx }}>
      {questions.map((question, index) => (
        <RABox
          key={question.id}
          p={2}
          sx={getQuestionRowSx({
            isLast: index === questions.length - 1,
            isOutdated: Boolean(question.isOutdated),
          })}
        >
          <RATypography
            id={`${questionnaireId}-${question.id}-label`}
            variant="subtitle2"
            fontWeight="medium"
            mb={2}
            color={question.isOutdated ? "error" : "text"}
          >
            {showRowNumbers && `${index + 1}. `}
            {question.text}
            {question.explanation && (
              <Tooltip
                title={question.explanation}
                arrow
                describeChild
                componentsProps={{
                  tooltip: {
                    sx: {
                      maxWidth: "min(480px, calc(100vw - 32px))",
                      textAlign: "left",
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                      px: 2,
                      py: 1.5,
                      overflowWrap: "anywhere",
                    },
                  },
                }}
              >
                <IconButton
                  type="button"
                  size="small"
                  aria-label={t("common.moreInformation", "More information")}
                  sx={{ ml: 0.5, p: 0.5, verticalAlign: "middle", color: "info.main" }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </RATypography>

          <RadioGroup
            aria-labelledby={`${questionnaireId}-${question.id}-label`}
            aria-required={question.isRequired || undefined}
            value={values[question.id] ?? ""}
            onChange={(event) => onChange(question.id, event.target.value)}
          >
            {(question.options || []).map((option, optionIndex) => {
              const optionValue = String(
                option.code ?? option.id ?? option.text ?? optionIndex
              );

              return (
                <FormControlLabel
                  key={optionValue}
                  value={optionValue}
                  control={
                    <Radio
                      disableRipple
                      disabled={question.disabled || isReadOnly}
                      sx={{
                        color: theme.palette.info.main,
                        "&.Mui-checked": {
                          color: theme.palette.info.main,
                        },
                      }}
                    />
                  }
                  label={
                    <RATypography
                      variant="button"
                      color="text"
                      fontWeight="bold"
                    >
                      {option.text}
                    </RATypography>
                  }
                  sx={{ mb: 1 }}
                />
              );
            })}
          </RadioGroup>
        </RABox>
      ))}
    </RABox>
  );
}

Questionnaire.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      text: PropTypes.string.isRequired,
      explanation: PropTypes.string,
      disabled: PropTypes.bool,
      isOutdated: PropTypes.bool,
      isRequired: PropTypes.bool,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          code: PropTypes.string,
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          text: PropTypes.string.isRequired,
        })
      ),
    })
  ).isRequired,
  values: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ),
  onChange: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
  sx: PropTypes.object,
  showRowNumbers: PropTypes.bool,
  isReadOnly: PropTypes.bool,
};

Questionnaire.defaultProps = {
  values: {},
  sx: {},
  showRowNumbers: false,
  isReadOnly: false,
};
