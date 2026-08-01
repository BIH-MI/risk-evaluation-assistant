// src/components/input/RAQuestionnaire/Questionnaire.js
import React from "react";
import PropTypes from "prop-types";
import { Radio, RadioGroup, FormControlLabel } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

export default function Questionnaire({
                                        questions,
                                        values,
                                        onChange,
                                        pageSize,
                                        sx,
                                        showRowNumbers = false,
                                        isReadOnly = false,
                                      }) {
  const theme = useTheme();

  return (
    <RABox sx={{ width: "100%", height: "100%", ...sx }}>
      {questions.map((q, idx) => (
        <RABox
          key={q.id}
          p={2}
          sx={{
            backgroundColor: q.isOutdated ? "#ffebee" : "transparent",
            borderBottom: idx === questions.length - 1 ? "none" : "1px solid #f0f0f0",
          }}
        >
          {/* Question Text Row */}
          <RATypography
            variant="subtitle2"
            fontWeight="medium"
            mb={2}
            color={q.isOutdated ? "error" : "text"}
          >
            {showRowNumbers && `${idx + 1}. `}{q.text}
            {q.isRequired && <span style={{ color: 'red' }}> *</span>}
          </RATypography>

          {/* Options */}
          <RadioGroup
            value={values[q.id] || ""}
            onChange={(e) => onChange(q.id, e.target.value)}
          >
            {(q.options || []).map((opt, oIdx) => {
              // CRITICAL FIX: Ensure the value is ALWAYS a string, and has a fallback to text
              const optionValue = String(opt.code || opt.id || opt.text || oIdx);

              return (
                <FormControlLabel
                  key={optionValue}
                  value={optionValue}
                  control={
                    <Radio
                      disableRipple
                      disabled={q.disabled || isReadOnly}
                      sx={{
                        color: theme.palette.info.main,
                        "&.Mui-checked": {
                          color: theme.palette.info.main,
                        },
                      }}
                    />
                  }
                  label={<RATypography variant="button" color="text" fontWeight="bold">{opt.text}</RATypography>}
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
      )
    })
  ).isRequired,
  values: PropTypes.objectOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number]) // Updated to accept both just in case
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