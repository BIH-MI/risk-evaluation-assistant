// src/components/input/RAQuestionnaire/Questionnaire.js
import React from "react";
import PropTypes from "prop-types";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Radio,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";

const OPTIONS = ["YES", "UNKNOWN", "NO"];
const ROW_HEIGHT = 56; // px, approximate MUI TableRow height

export default function Questionnaire({
                                        questions,
                                        values,
                                        onChange,
                                        pageSize,
                                        sx,
                                        showRowNumbers = false,
                                      }) {
  const theme = useTheme();

  return (
    <RABox
      sx={{
        width: "100%", height: "100%",
        bgColor: theme.palette.common.white,
        boxShadow: theme.shadows[2],
        borderRadius: 2,
        overflow: "hidden",
        ...sx,
      }}
    >
      <TableContainer sx={{ height: "100%" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {showRowNumbers && (
                <TableCell sx={{ width: "5%" }}>
                  <RATypography variant="subtitle2">#</RATypography>
                </TableCell>
              )}
              <TableCell sx={{ width: showRowNumbers ? "60%" : "100%" }}>
                <RATypography variant="subtitle2">Question</RATypography>
              </TableCell>
              {OPTIONS.map((opt) => (
                <TableCell
                  key={opt}
                  align="center"
                  sx={{ width: `${(35 / OPTIONS.length).toFixed(2)}%` }}
                >
                  <RATypography variant="subtitle2">{opt}</RATypography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map(({ id, text, disabled }, idx) => (
              <TableRow key={id} sx={{ height: ROW_HEIGHT }}>
                {showRowNumbers && (
                  <TableCell sx={{ pr: 2 }}>
                    <RATypography variant="body2">
                      {idx + 1}
                    </RATypography>
                  </TableCell>
                )}
                <TableCell sx={{ pr: 2 }}>
                  <RATypography
                    variant="body2"
                  >
                    {text}
                  </RATypography>
                </TableCell>
                {OPTIONS.map((opt) => (
                  <TableCell
                    key={opt}
                    align="center"
                  >
                    <Radio
                      name={`question-${id}`}
                      value={opt}
                      checked={values[id] === opt}
                      onChange={() => onChange(id, opt)}
                      disabled={disabled}
                      size="medium"
                      sx={{
                        color: theme.palette.primary.main,
                        "&.Mui-checked": {
                          color: theme.palette.primary.dark,
                        },
                        "& svg": { fontSize: 28 },
                      }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </RABox>
  );
}

Questionnaire.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      text: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ).isRequired,
  values: PropTypes.objectOf(PropTypes.oneOf(["YES", "UNKNOWN", "NO"])),
  onChange: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
  sx: PropTypes.object,
  showRowNumbers: PropTypes.bool,
};

Questionnaire.defaultProps = {
  title: "",
  values: {},
  sx: {},
  showRowNumbers: false,
};