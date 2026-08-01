// src/components/input/RAQuestionnaire/PaginatedQuestionnaire.js
import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { Icon, Autocomplete } from "@mui/material";
import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import RAPagination from "components/navigation/RAPagination";
import RATypography from "components/display/RATypography";
import Questionnaire from "./Questionnaire";

export default function PaginatedQuestionnaire({
                                                 title,
                                                 questions,
                                                 values,
                                                 onChange,
                                                 showRowNumbers,
                                                 pageSizeOptions,
                                                 defaultPageSize,
                                                 disablePagination,
                                                 isReadOnly,
                                                 sx,
                                               }) {
  // Pagination state
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [pageIndex, setPageIndex] = useState(0);

  // Compute number of pages
  const pageCount = useMemo(
    () => Math.ceil(questions.length / pageSize),
    [questions.length, pageSize]
  );

  // Page indices
  const pageOptions = useMemo(
    () => Array.from({ length: pageCount }, (_v, i) => i),
    [pageCount]
  );

  // Slice visible questions
  const visible = useMemo(
    () =>
      questions.slice(
        pageIndex * pageSize,
        pageIndex * pageSize + pageSize
      ),
    [questions, pageIndex, pageSize]
  );

  // Reset to first page on data or page size change
  useEffect(() => {
    setPageIndex(0);
  }, [questions.length, pageSize]);

  // If pagination is disabled, render all questions with no paging controls
  if (disablePagination) {
    return (
      <RABox sx={{ mx: "auto", ...sx }}>
        {title && (
          <RATypography variant="h5" fontWeight="bold" align="center" mb={2}>
            {title}
          </RATypography>
        )}
        <Questionnaire
          questions={questions}
          values={values}
          onChange={onChange}
          pageSize={questions.length}
          showRowNumbers={showRowNumbers}
          isReadOnly={isReadOnly}
        />
      </RABox>
    );
  }

  return (
    <RABox sx={{ mx: "auto", ...sx }}>
      {title && (
        <RATypography variant="h5" fontWeight="bold" align="center" mb={2}>
          {title}
        </RATypography>
      )}

      {/* Render current page */}
      <Questionnaire
        questions={visible}
        values={values}
        onChange={onChange}
        pageSize={visible.length}
        showRowNumbers={showRowNumbers}
        isReadOnly={isReadOnly}
      />

      {/* Paging controls */}
      {pageCount > 1 && (
        <RABox
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent={{ xs: "flex-start", sm: "space-between" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          mt={3}
        >
          <RABox display="flex" alignItems="center" mb={{ xs: 2, sm: 0 }}>
            <Autocomplete
              disableClearable
              value={pageSize.toString()}
              options={pageSizeOptions.map((n) => n.toString())}
              onChange={(_e, val) => setPageSize(Number(val))}
              size="small"
              sx={{ width: "5rem" }}
              renderInput={(params) => <RAInput {...params} />}
            />
            <RATypography variant="caption">&nbsp;&nbsp;questions per page</RATypography>
          </RABox>

          <RABox>
            <RAPagination variant="gradient" color="info" sx={{ display: "flex", alignItems: "center" }}>
              <RAPagination
                item
                onClick={() => pageIndex > 0 && setPageIndex(pageIndex - 1)}
                disabled={pageIndex === 0}
              >
                <Icon sx={{ fontWeight: "bold" }}>chevron_left</Icon>
              </RAPagination>
              {pageOptions.map((opt) => (
                <RAPagination
                  item
                  key={opt}
                  onClick={() => setPageIndex(opt)}
                  active={pageIndex === opt}
                >
                  {opt + 1}
                </RAPagination>
              ))}
              <RAPagination
                item
                onClick={() => pageIndex < pageCount - 1 && setPageIndex(pageIndex + 1)}
                disabled={pageIndex === pageCount - 1}
              >
                <Icon sx={{ fontWeight: "bold" }}>chevron_right</Icon>
              </RAPagination>
            </RAPagination>
          </RABox>
        </RABox>
      )}
    </RABox>
  );
}

PaginatedQuestionnaire.propTypes = {
  title: PropTypes.string,
  questions: PropTypes.arrayOf(PropTypes.object).isRequired,
  values: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  defaultPageSize: PropTypes.number,
  disablePagination: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  sx: PropTypes.object,
  showRowNumbers: PropTypes.bool,
};

PaginatedQuestionnaire.defaultProps = {
  title: "",
  values: {},
  pageSizeOptions: [5, 10, 15],
  defaultPageSize: 5,
  disablePagination: false,
  isReadOnly: false,
  sx: {},
  showRowNumbers: false,
};