import React from "react";
import PropTypes from "prop-types";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
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
            variant="subtitle2"
            fontWeight="medium"
            mb={2}
            color={question.isOutdated ? "error" : "text"}
          >
            {showRowNumbers && `${index + 1}. `}
            {question.text}
            {question.isRequired && (
              <span style={{ color: theme.palette.error.main }}> *</span>
            )}
          </RATypography>

          <RadioGroup
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
